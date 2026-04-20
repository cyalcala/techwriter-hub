/**
 * 🧬 NICHE DNA CONFIGURATION
 * 
 * This file centralizes all the parameters that define a specific niche. 
 * By modifying this config, the same "Titanium" engine can power any niche
 * (e.g., PH VAs, Web3 Devs, LATAM Designers).
 */

export interface Source {
  id: string;
  name: string;
  url: string;
  platform: string;
  defaultJobType: string;
  tags: string[];
  ethical_note: string;
  is_json?: boolean;
  json_type?: "JobStreet" | "Indeed";
  trustLevel: "native" | "global"; // 'native' = PH-specific, 'global' = Worldwide/Noisy
}

export interface NicheConfig {
  name: string;
  primary_region: string;
  primary_niche: string;
  budget_mode: "normal" | "tight";
  
  // 🎯 TARGET SIGNALS: Positive patterns that identify this niche
  target_signals: {
    region: string[];
    role: string[];
    remote: string[];
  };

  // 🛡️ KILL LISTS: Negative patterns for the native Zig sifter
  kill_lists: {
    titles: string[];
    companies: string[];
    content: string[];
  };

  // 📡 DATA SOURCES
  rss_sources: Source[];
  json_sources: Source[];

  // 🚥 OBSERVABILITY SLOs (Goldilocks)
  slo: {
    heartbeat_stale_minutes: number;
    heartbeat_delayed_minutes: number;
    heartbeat_suspect_window_minutes: number;
    ingestion_staleness_threshold_hrs: number;
    db_staleness_threshold_hrs: number;
    remediation_cooldown_minutes: number;
  };

  // 🛡️ EDGE SHIELD
  edge_proxy_url?: string;
  proxy_secret?: string;
}

export function getConfig(env?: any): NicheConfig {
  const isNode = typeof process !== 'undefined' && process.env;
  
  return {
    name: "TechWriter Hub",
    regions: ["Global"],
    primary_region: "Global",
    primary_niche: "TECHNICAL_WRITING",
    budget_mode: (env?.BUDGET_MODE || (isNode ? process.env.BUDGET_MODE : null) || "normal") as any,

    slo: {
      heartbeat_stale_minutes: Number(env?.HEARTBEAT_STALE_MINUTES || (isNode ? process.env.HEARTBEAT_STALE_MINUTES : null) || 120),
      heartbeat_delayed_minutes: Number(env?.HEARTBEAT_DELAYED_MINUTES || (isNode ? process.env.HEARTBEAT_DELAYED_MINUTES : null) || 90),
      heartbeat_suspect_window_minutes: Number(env?.HEARTBEAT_SUSPECT_WINDOW_MINUTES || (isNode ? process.env.HEARTBEAT_SUSPECT_WINDOW_MINUTES : null) || 120),
      ingestion_staleness_threshold_hrs: Number(env?.INGESTION_STALENESS_THRESHOLD || (isNode ? process.env.INGESTION_STALENESS_THRESHOLD : null) || 24),
      db_staleness_threshold_hrs: Number(env?.DB_STALENESS_THRESHOLD || (isNode ? process.env.DB_STALENESS_THRESHOLD : null) || 4),
      remediation_cooldown_minutes: Number(env?.WATCHDOG_REMEDIATION_COOLDOWN_MIN || (isNode ? process.env.WATCHDOG_REMEDIATION_COOLDOWN_MIN : null) || 90),
    },

  target_signals: {
    region: ["global", "remote", "worldwide", "anywhere", "usa", "uk", "canada", "europe", "philippines", "ph", "remote ph"],
    role: [
      "technical writer", "technical writing", "documentation specialist", "api documentation", 
      "technical author", "content designer", "ux writer", "documentation engineer",
      "developer documentation", "knowledge base manager", "instructional designer",
      "technical editor", "information developer", "technical content"
    ],
    remote: ["remote", "global", "worldwide", "anywhere", "work from home", "wfh"]
  },
 
  kill_lists: {
    titles: [
      "virtual assistant", "va", "data entry", "bookkeeping", "admin assistant", "customer service",
      "sales", "bdr", "sdr", "marketing manager", "seo specialist", "social media", "video editor", 
      "graphic designer", "moderator", "transcription", "translator", "clerk", "hr", "recruiter",
      "ceo", "cto", "cfo", "vp", "director", "president", "head of", "principal", "leadership", 
      "software engineer", "fullstack", "backend", "frontend", "devops", "sre", "data scientist",
      "analyst", "product manager", "project manager", "intern", "business intelligence", "bi analyst",
      "accountant", "lawyer", "nurse", "doctor", "chemist", "biologist", "scientist", 
      "medical", "pharmacist", "researcher", "physicist", "geologist",
      "engineer", "designer", "architect", "coordinator", "lead", "head"
    ],
    companies: ["google", "meta", "apple", "microsoft", "amazon"], // High-noise generic searches
    content: [
      "beijing", "shanghai", "tokyo", "riyadh", "dubai",
      "success story", "how to build", "reading this", "join us", "blog post", "article", "news"
    ]
  },

  rss_sources: [
    {
      id: "himalayas",
      name: "Himalayas",
      url: "https://himalayas.app/jobs/rss",
      platform: "Himalayas",
      defaultJobType: "full-time",
      tags: ["remote", "global"],
      ethical_note: "Official public RSS feed provided by Himalayas for job syndication.",
      region: "Global",
      trustLevel: "global"
    },
    {
      id: "we-work-remotely",
      name: "We Work Remotely",
      url: "https://weworkremotely.com/remote-jobs.rss",
      platform: "WeWorkRemotely",
      defaultJobType: "full-time",
      tags: ["remote", "global"],
      ethical_note: "Public RSS feed offered by WWR.",
      region: "Global",
      trustLevel: "global"
    },
    {
      id: "remote-ok",
      name: "Remote OK",
      url: "https://remoteok.com/remote-jobs.rss",
      platform: "RemoteOK",
      defaultJobType: "full-time",
      tags: ["remote", "high-pay"],
      ethical_note: "Public RSS feed. RemoteOK openly provides this for syndication.",
      region: "Global",
      trustLevel: "global"
    },
    {
      id: "problogger",
      name: "ProBlogger Jobs",
      url: "https://problogger.com/jobs/feed/",
      platform: "ProBlogger",
      defaultJobType: "freelance",
      tags: ["writing", "freelance"],
      ethical_note: "Public RSS job board feed. Companies pay to list writing roles.",
      region: "Global",
      trustLevel: "global"
    }
  ],

  json_sources: [
    {
      id: "jobstreet-ph-techwriter",
      name: "JobStreet PH (Technical Writer)",
      url: "https://ph.jobstreet.com/api/chalice-search/v4/search?siteKey=PH-Main&where=Philippines&keywords=technical+writer",
      platform: "JobStreet",
      defaultJobType: "full-time",
      tags: ["philippines", "technical-writing"],
      ethical_note: "Public JSON search endpoint.",
      is_json: true,
      json_type: "JobStreet",
      region: "Philippines",
      trustLevel: "native"
    }
  ],

  edge_proxy_url: (env?.EDGE_PROXY_URL || (isNode ? process.env.EDGE_PROXY_URL : null) || "https://va-edge-proxy.cyrusalcala-agency.workers.dev"),
  proxy_secret: (env?.VA_PROXY_SECRET || (isNode ? process.env.VA_PROXY_SECRET : null))
  };
}

export const config = getConfig();
