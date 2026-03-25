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
  const isFresh = ageHrs < 1; // Under 1 hour
  const isHot = ageHrs < 0.25; // 15 mins
  const displayDate = formatRelativeTime(signal.latestActivityMs ? new Date(signal.latestActivityMs) : null);
  
  const statusBadge = isHot 
    ? `<span class="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg shadow-sm shrink-0 mt-1 animate-pulse">Ultra Fresh</span>`
    : isFresh
    ? `<span class="px-2 py-0.5 bg-emerald-400/20 text-emerald-600 text-[8px] font-black uppercase rounded-lg border border-emerald-400/30 shrink-0 mt-1">Live Signal</span>`
    : (ageHrs < 24 ? `<span class="px-2 py-0.5 bg-oat-100 text-blueberry-500 text-[8px] font-black uppercase rounded-lg border border-oat-200 shrink-0 mt-1">Recent</span>` : '');

  const burnIcon = signal.tier < 2 ? `<span class="text-[10px]" title="Priority Tier">💎</span>` : '';
  const freshStyles = isFresh ? 'border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-oat-200/50 hover:border-oat-200 hover:shadow-md';
  const glowBar = isFresh ? '<div class="absolute -top-[2px] -left-[2px] -right-[2px] h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse rounded-t-2xl z-20"></div>' : '';

  return `
    <a 
      href="${signal.sourceUrl}" 
      target="_blank" 
      class="opp-item flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-5 rounded-2xl bg-[#FDFBF7] border-2 transition-all group relative active:scale-[0.98] shadow-sm gap-4 ${freshStyles}"
      data-search="${(signal.title + ' ' + (signal.company || '')).toLowerCase()}"
      data-age="${ageHrs}"
    >
      ${glowBar}
      <div class="flex items-center gap-4 sm:gap-6 w-full overflow-hidden relative z-10">
        <div class="flex sm:flex-col items-center gap-2 sm:gap-0 sm:w-24">
          <span class="text-[10px] font-black text-blueberry-800/40 uppercase tracking-tighter w-full">${displayDate}</span>
          ${statusBadge}
        </div>
        <div class="h-10 w-[1px] bg-oat-200/50 hidden sm:block"></div>
        <div class="min-w-0 flex-1">
          <h3 class="text-[15px] font-bold text-blueberry-900/90 group-hover:text-emerald-600 transition-colors leading-tight mb-0.5 uppercase tracking-tight break-words">${signal.title}</h3>
          <div class="flex items-center gap-2 lowercase">
            <span class="text-[10px] text-blueberry-800/60 font-bold uppercase tracking-widest truncate max-w-[150px]">${signal.company || 'Direct Client'}</span>
            ${burnIcon}
            <span class="h-1 w-1 rounded-full bg-oat-300"></span>
            <span class="text-[9px] font-black text-blueberry-800/20 uppercase tracking-[0.2em]">${signal.sourcePlatform || 'N/A'}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between sm:justify-end gap-4 text-blueberry-800/20 relative z-10">
         <div class="w-10 h-10 rounded-full bg-oat-100 group-hover:bg-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 transition-all scale-75 group-hover:scale-100 shadow-sm">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="text-blueberry-500 group-hover:text-white"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
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
