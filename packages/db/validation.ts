import { z } from "zod";

export const OpportunitySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  company: z.string().min(1).max(255).default("Generic"),
  type: z.enum(["agency", "direct"]).default("agency"),
  sourceUrl: z.string().url(),
  sourcePlatform: z.string().optional(),
  tags: z.string().optional().default("[]"), // Stored as JSON string in DB
  locationType: z.string().default("remote"),
  payRange: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  postedAt: z.union([z.date(), z.string(), z.number()]).optional().nullable(),
  scrapedAt: z.date().default(() => new Date()),
  isActive: z.boolean().default(true),
  tier: z.number().int().min(1).max(4).default(3),
  contentHash: z.string().optional().nullable(),
  latestActivityMs: z.number().int().default(0),
  companyLogo: z.string().url().optional().nullable().or(z.literal("")),
  metadata: z.string().optional().default("{}")
});

export type ValidOpportunity = z.infer<typeof OpportunitySchema>;

export function validateOpportunity(data: any): ValidOpportunity | null {
  const result = OpportunitySchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}
