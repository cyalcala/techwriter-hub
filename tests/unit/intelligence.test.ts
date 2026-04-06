import { describe, it, expect } from "bun:test";
import { validateAIExtraction } from "../../packages/db/validation";
import { stripJunk } from "../../apps/frontend/src/lib/ai/waterfall";
import { siftOpportunity } from "../../src/core/sieve";
import { JobDomain } from "../../packages/db/taxonomy";

describe("Priority 4: V12 Agentic Sifter", () => {
  it("V12: Should correctly target PH-Direct jobs as Platinum (Tier 0)", () => {
    const phDirectData = {
      title: "VA for Philippines Only",
      company: "PH Agency",
      description: "Must be located in Manila. Salary in PHP.",
      niche: "VA_SUPPORT",
      tier: 0,
      isPhCompatible: true,
      relevanceScore: 100
    };
    const result = validateAIExtraction(phDirectData);
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(0);
  });

  it("V12: Should reject US-only jobs (isPhCompatible: false)", () => {
    const usOnlyData = {
      title: "Executive Assistant",
      company: "US Corp",
      description: "Must be a US Citizen residing in New York.",
      niche: "ADMIN_BACKOFFICE",
      tier: 4,
      isPhCompatible: false,
      relevanceScore: 0
    };
    const result = validateAIExtraction(usOnlyData);
    expect(result).not.toBeNull();
    expect(result?.isPhCompatible).toBe(false);
  });

  it("V12: EMERGENCY FALLBACK - Should use Heuristic Sifter on AI blackout", () => {
    const rawTitle = "Accounting Virtual Assistant";
    const rawHtml = "Need help with bookkeeping and tax prep.";
    
    // Simulate the fallback logic used in functions.ts
    const heuristic = siftOpportunity(rawTitle, rawHtml, "Mock Co", "Heuristic Fallback");
    
    expect(heuristic.domain).toBe(JobDomain.ADMIN_BACKOFFICE);
    expect(heuristic.tier).toBeLessThan(4); // Should be a valid job
  });
});

describe("Priority 3: The Intelligence Mesh (Zod Firewall)", () => {
  const mockRawHtml = "<html><head><title>Junk</title></head><body><script>console.log('bad')</script><nav>Home</nav><h1>Accounting Clerk</h1><p>We need a bookkeeper...</p><footer>Contact Us</footer></body></html>";

  it("VECTOR 3: Token Guard - Should strip junk HTML tags", () => {
    const cleaned = stripJunk(mockRawHtml);
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).not.toContain("<nav>");
    expect(cleaned).not.toContain("<footer>");
    expect(cleaned).toContain("<h1>Accounting Clerk</h1>");
    expect(cleaned).toContain("<p>We need a bookkeeper...</p>");
    
    const reduction = ((mockRawHtml.length - cleaned.length) / mockRawHtml.length) * 100;
    expect(reduction).toBeGreaterThan(20); // Significant reduction
  });

  it("RED: Should reject hallucinated categories", () => {
    const hallucinatedResponse = {
      title: "Accounting Clerk",
      company: "CloudVAs",
      salary: "$1000",
      description: "We need a bookkeeper for our team.",
      niche: "Underwater Basket Weaving", // INVALID
      type: "agency"
    };

    const result = validateAIExtraction(hallucinatedResponse);
    expect(result).toBeNull();
  });

  it("GREEN-FUZZY: Should map 'Accounting' to 'ADMIN_BACKOFFICE'", () => {
    const fuzzyResponse = {
      title: "Accounting Clerk",
      company: "CloudVAs",
      salary: "$1000",
      description: "We need a bookkeeper for our team.",
      niche: "Accounting", // Fuzzy
      type: "agency"
    };

    const result = validateAIExtraction(fuzzyResponse);
    expect(result).not.toBeNull();
    expect(result?.niche).toBe("ADMIN_BACKOFFICE");
  });

  it("GREEN-STRICT: Should accept valid 7-Plate Taxonomies directly", () => {
    const validResponse = {
      title: "Senior Dev",
      company: "TechCorp",
      salary: "$5000",
      description: "Building the future of AI.",
      niche: "TECH_ENGINEERING",
      type: "direct"
    };

    const result = validateAIExtraction(validResponse);
    expect(result).not.toBeNull();
    expect(result?.niche).toBe("TECH_ENGINEERING");
  });
});
