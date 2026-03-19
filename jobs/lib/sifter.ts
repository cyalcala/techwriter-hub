/**
 * Intelligent Job Sifter (JS Version)
 * Categorizes and filters jobs before they reach the database.
 */

export enum OpportunityTier {
  GOLD = 1,      // PH-focused / High-Accessibility
  SILVER = 2,    // Global Remote / Entry
  BRONZE = 3,    // General
  TRASH = 4      // Regional-locked / Ultra-Senior Tech / Non-English
}

const STRICT_KILLS = [
  "strictly us", "usa only", "us only", "americas only", "citizens only", 
  "uk only", "united kingdom only", "canada only", "europe only", "china only",
  "u.s. cities", "united states only", "us based", "usa based",
  "ceo", "cto", "cfo", "cio", "coo", "vp", "vice president", "director", "president", "head of", "principal", "lead", "leadership", "executive", "staff", "senior", "strategist", "manager", "researcher"
];


const REGIONAL_KILLS = [
  "beijing", "shanghai", "tokyo", "london", "paris", "berlin", "moscow", "riyadh",
  "dubai", "new york", "san francisco", "chicago", "hong kong", "singapore",
  "china", "europe", "emea", "latam", "portuguese", "spanish", "german", "french"
];

const TECH_KILLS = [
  "engineer", "developer", "software", "devops", "sre", "data scientist", "programmer", "architect", "fullstack", "backend", "frontend", "coder", "systems", "tech", "technical", "coding", "javascript", "typescript", "python", "java", "react", "vue", "angular", "node", "aws", "cloud", "infrastructure", "cybersecurity", "security", "ai", "machine learning", "ml", "data science"
];


const SEA_SIGNALS = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "southeast asia", "asean", "vietnam", "thailand", "indonesia", "malaysia", "singapore"];

const REMOTE_SIGNALS = ["remote", "global", "worldwide", "anywhere", "work from home", "wfh"];

export function siftOpportunity(title: string, company: string, description: string, sourcePlatform?: string): OpportunityTier {
  const t = title.toLowerCase();
  const c = company.toLowerCase();
  const d = (description || "").toLowerCase();
  const s = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${c} ${d} ${s}`;

  // 0. Hard Kill (Trash Tier)
  // A. Strict Kills (Exclusions or Tech/Exec override everything)
  if (STRICT_KILLS.some(k => t.includes(k) || (body.includes(k) && !body.includes("assistant")))) {
    return OpportunityTier.TRASH;
  }

  // B. Tech Hard Kill
  if (TECH_KILLS.some(tk => t.includes(tk)) && !body.includes("junior") && !body.includes("support")) {
    return OpportunityTier.TRASH;
  }

  // C. Regional Kills (Spared by Remote/Global)
  if (REGIONAL_KILLS.some(k => body.includes(k) && !SEA_SIGNALS.some(sea => body.includes(sea)) && !REMOTE_SIGNALS.some(r => body.includes(r)))) {
    return OpportunityTier.TRASH;
  }

  // 1. Gold Tier (The Hyper-Strict Gold)
  // Categories: VA, CS, Admin, Design, Sales, Marketing
  const vaSignals = ["virtual assistant", "va", "data entry", "bookkeeping", "executive assistant", "admin assistant", "customer service", "customer support", "moderator", "transcription", "clerk", "receptionist"];
  const salesSignals = ["sales", "bdr", "sdr", "account executive", "account manager", "appointment setter"];
  const marketingSignals = ["marketing", "seo", "social media", "copywriter", "content creator", "growth"];
  const designSignals = ["designer", "ui", "ux", "creative", "video editor", "graphic designer", "illustrator"];
  
  const isTargetCategory = [...vaSignals, ...salesSignals, ...marketingSignals, ...designSignals].some(sig => t.includes(sig));
  const hasSeaSignal = SEA_SIGNALS.some(sea => body.includes(sea));
  
  // Prioritize Reddit, Brave Search, and Direct (NoRepublic, etc.)
  const highFidelitySource = ["reddit", "brave", "direct", "manual", "upwork"];

  if (isTargetCategory && (hasSeaSignal || REMOTE_SIGNALS.some(r => body.includes(r)))) {
    if (highFidelitySource.some(src => s.includes(src))) return OpportunityTier.GOLD;
    return hasSeaSignal ? OpportunityTier.GOLD : OpportunityTier.SILVER;
  }

  // 2. Trash (Vague or Non-Target)
  return OpportunityTier.TRASH; // If not a target category or no sea/remote signal, it's trash.
}

