/**
 * 🛡️ DEFENSE IN DEPTH: Temporal Normalization
 * Standardizes both 10-digit (seconds) and 13-digit (milliseconds) timestamps.
 * Eliminates "Epoch Hallucination" across distributed environments.
 */
export const normalizeDate = (val: any): Date => {
  if (!val) return new Date(0);
  
  // Convert strings or other formats to numeric timestamp
  const num = typeof val === 'number' ? val : new Date(val).getTime();
  
  // 🛰️ HEAL Hallucination: If year > 10000 (approx 2.5e14 ms), 
  // Drizzle likely hydrated ms as s, or it's a massive overflow.
  if (num > 250000000000000) { 
    return new Date(num / 1000);
  }
  
  // Standard: If < 10B, it's seconds (UNIX default).
  // 10,000,000,000 corresponds to Sat Nov 20 2286 17:46:40 UTC
  return num < 10000000000 ? new Date(num * 1000) : new Date(num);
};

// 🔒 THE IDEMPOTENCY SHIELD: Discovery Hash (Edge-Compatible)
export function generateDiscoveryHash(title: string, url: string, company: string = "Generic"): string {
  const str = `${title.toLowerCase()}::${company.toLowerCase()}::${url.split('?')[0].toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
