/**
 * VA.INDEX Codified Core: The Sieve v11.0
 * Philippine-First Five-Tier Classification
 * Autonomous Filtering Engine
 */

export enum OpportunityTier {
  PLATINUM = 0, GOLD = 1, SILVER = 2, BRONZE = 3, TRASH = 4
}

import { JobDomain, mapTitleToDomain, extractDisplayTags } from "../../packages/db/taxonomy";

export interface SiftResult {
  tier: OpportunityTier;
  domain: JobDomain;
  displayTags: string[];
  relevanceScore: number;
}

const GEO_EXCLUSION_KILLS = [
  "us only","us citizens only","usa only","united states only",
  "must be authorized to work in the us","us work authorization required",
  "must be based in the us","must reside in the us","must be a us resident",
  "must live in the us","us citizen or permanent resident",
  "w-2 employee","w2 only","w2 employee",
  "uk only","uk citizens only","must be based in the uk","must have right to work in the uk",
  "eu only","eu citizens only","eea only","must be based in europe",
  "emea only","emea-based","north america only",
  "canada only","must be in canada","australia only","must be in australia",
  "must have right to work in australia","new zealand only",
  "must be in new york","must be in california","must be in portland","must be in atlanta",
  "must be in chicago","must be in austin","must be in seattle","must be in boston",
  "must be in dallas","must be in denver","must be in phoenix",
  "must be in london","must be in toronto",
  "dach","nordics","benelux","latam only","south america only",
  "est time zone","pst time zone","cst time zone","mst time zone",
  "et time zone","pt time zone","ct time zone","mt time zone",
  "eastern time zone","pacific time zone","central time zone","mountain time zone",
  "visa sponsorship is not available", "sponsorship not available",
  "reside in the following states", "united states of america",
];

const TITLE_GEO_KILLS = [
  "united states", " u.s.", " us ", " usa ", "uk only", " u.k.", " canada", 
  " australia", " europe", " germany", " france", " netherlands", " sweden", 
  " norway", " denmark", " finland", " ireland", " switzerland", " austria", 
  " belgium", " spain", " italy", " portugal", " greece", " israel", 
  " north america", " south america", " emea", " apac only", " latam",
  "united kingdom", "london-based", "ny-based", "sf-based", "la-based",
  "atlanta-based", "chicago-based", "austin-based", "seattle-based",
  "atlanta-based", "chicago-based", "austin-based", "seattle-based",
  "dallas-based", "denver-based", "phoenix-based",
];

const LANGUAGE_KILLS = [
  "japanese speaker","french speaker","german speaker","spanish speaker",
  "bilingual spanish","bilingual french","bilingual japanese","mandarin",
  "cantonese","korean speaker","portuguese speaker","italian speaker",
  "dutch speaker","scandinavian speaker","fluent in spanish","fluent in french",
];

const TECH_HARD_KILLS = [
  "software engineer","software developer","backend engineer","frontend engineer",
  "full stack","fullstack","full-stack","mobile engineer","ios engineer","android engineer",
  "platform engineer","infrastructure engineer","site reliability"," sre",
  "devops","devsecops","cloud engineer","cloud architect","solutions architect",
  "machine learning"," ml engineer"," ai engineer","ai researcher",
  "data engineer","data scientist","data architect","analytics engineer",
  "security engineer","penetration tester","network engineer","network administrator",
  "database administrator"," dba","qa engineer"," sdet","test automation",
];

const TECH_ALLOWLIST = [
  "technical support","technical writer","technical recruiter",
  "no-code","prompt engineer","it support","help desk",
];

const ACHIEVABLE_ROLES = [
  "virtual assistant"," va ","admin assistant","administrative",
  "executive assistant"," ea ","personal assistant"," pa ",
  "office coordinator","operations coordinator","project coordinator",
  "customer support","customer service","customer success","client support",
  "support specialist","support representative","support agent",
  "help desk","live chat","chat support","community manager","community moderator",
  "content writer","blog writer","copywriter","copy editor","proofreader",
  "social media manager","social media coordinator","social media assistant",
  "digital marketing assistant","marketing coordinator","email marketing",
  "graphic designer","visual designer","brand designer","logo designer",
  "video editor","reel editor","photo editor","creative assistant",
  "bookkeeper","accounting assistant","accounts payable","accounts receivable",
  "data entry","research assistant","web researcher","market researcher",
  "sales support","sales coordinator","sales assistant","lead generation",
  "recruiter assistant","hr assistant","talent coordinator","sourcing assistant",
  "e-commerce assistant","amazon va","shopify va","etsy va","ebay va",
  "online tutor","english tutor","esl teacher",
  "zapier","make.com","airtable","notion","clickup","no-code","automation specialist",
];

const PLATINUM_DIRECT = [
  "hiring from the philippines","based in the philippines","from the philippines",
  "philippines only","ph only","filipino talent","filipino va","filipino applicants",
  "seeking filipino","for filipinos","pinoy","pinay","work from philippines",
  "remote from the philippines","must be based in ph","philippines-based","ph-based",
  "open to philippine applicants","looking for a filipino","we hire filipinos",
  "filipinos preferred","preferred location: philippines","location: philippines",
  "philippines preferred","tagalog","php salary","₱","pesos",
];

const PLATINUM_CITIES = [
  "manila","metro manila"," ncr","cebu","cebu city","davao","quezon city",
  "makati","bgc","taguig","pasig","mandaluyong",
];

const PLATINUM_PLATFORMS = [
  "vajobsph", "phcareers", "buhaydigital", "phjobs", "onlinejobs", "jobs.ph", "kalibrr",
  "virtualassistantph", "remoteworkph", "hiringph", "recruitinghiringph"
];

const GOLD_SIGNALS = [
  "southeast asia","sea region","asean","asia pacific","apac",
  "asia-based","asia remote","gmt+8","pht","philippine time",
];

const SILVER_SIGNALS = [
  "fully remote","100% remote","remote-first","work from anywhere","worldwide",
  "global remote","all timezones","async-first","location independent",
];

/**
 * 🧬 THE BOUNCER: Multi-stage sifter for Philippine-remote viability.
 */
export function siftOpportunity(
  title: string, 
  description: string, 
  company: string, 
  sourcePlatform: string,
  priorityAgencies: string[] = []
): SiftResult {
  const t  = (title || "").toLowerCase().trim();
  const d  = (description || "").toLowerCase();
  const c  = (company || "").toLowerCase().trim();
  const co = (company || "").toLowerCase();
  const sp = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${d} ${c}`;

  // 1. Core Tiering Logic
  const tier = calculateTier(t, d, c, co, sp, body, priorityAgencies);
  
  // 2. Taxonomy Mapping
  const domain = mapTitleToDomain(title, description);
  
  // 3. Display Tag Extraction
  const displayTags = extractDisplayTags(title, description);
  
  // 4. Gravity Scoring
  let relevanceScore = (3 - tier) * 100; 
  if (displayTags.includes("PH-DIRECT")) relevanceScore += 50;
  if (displayTags.includes("PREMIUM")) relevanceScore += 30;
  if (displayTags.includes("HIGH PAY")) relevanceScore += 20;

  return {
    tier,
    domain,
    displayTags,
    relevanceScore
  };
}

function calculateTier(
  t: string, d: string, c: string, co: string, sp: string, body: string,
  priorityAgencies: string[]
): OpportunityTier {
  const phKeywords = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "southeast asia"];
  const hasDirectPHInTitle = phKeywords.some(k => t.includes(k));
  
  const isPriorityAgency = priorityAgencies.some(a => co.includes(a.toLowerCase()) || sp.includes(a.toLowerCase()));
  if (isPriorityAgency) return OpportunityTier.PLATINUM;
  
  if (!hasDirectPHInTitle) {
    for (const k of TITLE_GEO_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  }
  
  for (const k of GEO_EXCLUSION_KILLS) if (body.includes(k)) return OpportunityTier.TRASH;
  for (const k of LANGUAGE_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  
  for (const k of TECH_HARD_KILLS) if (t.includes(k) && !TECH_ALLOWLIST.some(o => t.includes(o))) return OpportunityTier.TRASH;

  const COMPANY_KILLS = ["canonical", "gitlab", "ge healthcare", "nextiva", "toptal", "upwork", "fiverr"];
  for (const k of COMPANY_KILLS) if (c.includes(k) && !hasDirectPHInTitle) return OpportunityTier.TRASH;

  const isAchievableBaseRole = ACHIEVABLE_ROLES.some(r => t.includes(r));
  const isSupportRole = [
    "customer service", "customer support", "client support", "support specialist", 
    "support representative", "support agent", "help desk", "live chat", "chat support",
    "customer experience", "technical support", "it support"
  ].some(s => t.includes(s));
  
  const hasPHSignal = hasDirectPHInTitle || 
                     PLATINUM_DIRECT.some(s => body.includes(s)) || 
                     PLATINUM_CITIES.some(ci => body.includes(ci)) || 
                     PLATINUM_PLATFORMS.some(p => sp.includes(p));

  const hasSpecificAchievableRole = isAchievableBaseRole || isSupportRole;
  const hasGenericVARole = body.includes("virtual assistant") || body.includes(" va ");
  
  if (!hasSpecificAchievableRole && !hasGenericVARole && !hasPHSignal) {
     return OpportunityTier.TRASH;
  }

  const hasStrongPHSignal = hasDirectPHInTitle || 
                            PLATINUM_PLATFORMS.some(p => sp.includes(p)) ||
                            (t.includes("philippines") && (t.includes("only") || t.includes("based")));

  if (hasStrongPHSignal) return OpportunityTier.PLATINUM;
  
  const hasWeakPHSignal = PLATINUM_DIRECT.some(s => body.includes(s)) || 
                          PLATINUM_CITIES.some(ci => body.includes(ci));
                          
  if (hasWeakPHSignal) return OpportunityTier.GOLD; 

  if (GOLD_SIGNALS.some(s => body.includes(s))) return OpportunityTier.GOLD;
  if (SILVER_SIGNALS.some(s => body.includes(s))) return OpportunityTier.SILVER;
  
  return OpportunityTier.BRONZE;
}
