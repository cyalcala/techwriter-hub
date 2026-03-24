import type { APIRoute } from 'astro';
import { db } from '../../../lib/db-client.js';
import { opportunities } from '../../../lib/db-schema.js';
import { desc, not, eq, sql } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  // Optimized Query: 
  // 1. Filter by last 7 days to reduce scan set significantly
  // 2. Use indexed order: tier then latestActivityMs desc
  // 3. Limit to 100 to allow fast in-memory re-sorting for the 15m rule
  const rawSignals = await db.select()
    .from(opportunities)
    .where(sql`${opportunities.tier} != 4 AND ${opportunities.latestActivityMs} > ${sevenDaysAgo}`)
    .orderBy(opportunities.tier, desc(opportunities.latestActivityMs))
    .limit(100);

  // In-memory re-sorting to handle the dynamic 15-minute "hot" boost
  // This keeps the DB query extremely fast (indexed) while maintaining the complex logic
  const signals = rawSignals.sort((a, b) => {
    const scoreA = (a.tier || 3) + ((now - a.latestActivityMs) <= 900000 ? -5.0 : (now - a.latestActivityMs) / 14400000.0);
    const scoreB = (b.tier || 3) + ((now - b.latestActivityMs) <= 900000 ? -5.0 : (now - b.latestActivityMs) / 14400000.0);
    return scoreA - scoreB;
  }).slice(0, 50);

  const html = signals.map(sig => renderSignalCard(sig)).join('');
  
  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      'X-Content-Source': 'Turso-Edge-Cached'
    }
  });
};

function renderSignalCard(signal: any) {
  const ageHrs = signal.latestActivityMs ? (Date.now() - signal.latestActivityMs) / 3600000 : 0;
  const isHot = ageHrs < 0.25; // 15 mins
  const displayDate = formatRelativeTime(signal.latestActivityMs ? new Date(signal.latestActivityMs) : null);
  
  const hotBadge = isHot 
    ? `<span class="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg shadow-sm shrink-0">15m New</span>`
    : (ageHrs < 24 ? `<span class="px-2 py-0.5 bg-oat-100 text-blueberry-500 text-[8px] font-black uppercase rounded-lg border border-oat-200 shrink-0">Recent</span>` : '');

  const burnIcon = signal.tier < 2 ? `<span class="text-[10px]">🔥</span>` : '';

  return `
    <a 
      href="${signal.sourceUrl}" 
      target="_blank" 
      class="opp-item flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-5 rounded-2xl bg-[#FDFBF7] border-2 border-oat-200/50 hover:border-oat-200 hover:shadow-md transition-all group relative active:scale-[0.98] shadow-sm gap-4"
      data-search="${(signal.title + ' ' + (signal.company || '')).toLowerCase()}"
      data-age="${ageHrs}"
    >
      <div class="flex items-center gap-4 sm:gap-6">
        <div class="flex sm:flex-col items-center gap-2 sm:gap-0 sm:w-20">
          <span class="text-[10px] font-black text-blueberry-800/40 uppercase tracking-tighter">${displayDate}</span>
          ${hotBadge}
        </div>
        <div class="h-10 w-[1px] bg-oat-200/50 hidden sm:block"></div>
        <div class="min-w-0 flex-1">
          <h3 class="text-[15px] font-bold text-blueberry-900/90 group-hover:text-blueberry-600 transition-colors leading-tight mb-0.5 uppercase tracking-tight break-words">${signal.title}</h3>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-blueberry-800/60 font-bold uppercase tracking-widest truncate">${signal.company || 'Generic'}</span>
            ${burnIcon}
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between sm:justify-end gap-4 text-blueberry-800/20">
         <span class="text-[9px] font-black uppercase tracking-[0.2em]">${signal.sourcePlatform || 'N/A'}</span>
         <div class="w-10 h-10 rounded-full bg-oat-100 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 transition-all scale-75 group-hover:scale-100">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-blueberry-500"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
         </div>
      </div>
    </a>
  `;
}

function formatRelativeTime(dateInput: Date | null) {
  if (!dateInput) return 'Just Now';
  const now = new Date();
  const date = new Date(dateInput);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMs < 3600000) return 'Just Now';
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
