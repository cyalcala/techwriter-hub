/**
 * 🎯 ATS SNIPER SEED LIST
 * 
 * Contains surgical endpoints for Direct Companies and High-Intent Agencies.
 * These sources are targeted because they are known to hire globally (PH included)
 * and use stable JSON/XML APIs instead of brittle HTML.
 */

export interface Atssource {
  id: string;
  name: string;
  type: "greenhouse" | "lever" | "zoho" | "workable" | "rss";
  token: string;
  tags: string[];
}

export const atsSources: Atssource[] = [
  // --- DIRECT COMPANIES (The "Whales") ---
  { id: "zapier", name: "Zapier", type: "greenhouse", token: "zapier", tags: ["remote", "global", "saas"] },
  { id: "buffer", name: "Buffer", type: "greenhouse", token: "buffer", tags: ["remote", "global", "social"] },
  { id: "gitlab", name: "GitLab", type: "greenhouse", token: "gitlab", tags: ["remote", "global", "tech"] },
  { id: "automattic", name: "Automattic", type: "greenhouse", token: "automattic", tags: ["remote", "global", "wp"] },
  { id: "hotjar", name: "Hotjar", type: "lever", token: "hotjar", tags: ["remote", "global", "analytics"] },
  { id: "postman", name: "Postman", type: "lever", token: "postman", tags: ["remote", "global", "tech"] },

  // --- AGENCIES (The "Job Bringers") ---
  { id: "propva", name: "PropVA", type: "zoho", token: "propva", tags: ["ph-office", "real-estate", "uk"] },
  { id: "outsourcing-angel", name: "Outsourcing Angel", type: "rss", token: "https://outsourcingangel.com/feed/", tags: ["agency", "ph-va"] },
  { id: "virtalent", name: "Virtalent", type: "rss", token: "https://virtalent.com/feed/", tags: ["agency", "uk-va"] },
  { id: "reassist", name: "REassist", type: "rss", token: "https://reassist.com.au/feed/", tags: ["agency", "au-va", "real-estate"] },
  { id: "capital-ea", name: "Capital EA", type: "rss", token: "https://capitalea.com.au/feed/", tags: ["agency", "au-va", "ea"] },
  
  // Potential Additions based on user's agency list
  { id: "pmva", name: "PMVA", type: "rss", token: "https://pmva.com.au/feed/", tags: ["agency", "ph-va", "property"] },
  { id: "vaxtra", name: "Vaxtra", type: "rss", token: "https://vaxtra.com/feed/", tags: ["agency", "au-va"] }
];
