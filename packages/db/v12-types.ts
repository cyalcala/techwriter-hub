import { VaNiche } from "./schema";

/**
 * 🛰️ UNIFIED HARVEST SIGNAL
 * 
 * The standard data structure emitted by all V12 harvesters.
 * Ensures 'Goldmine' signals have the same fidelity as 'Scraped' signals.
 */
export interface HarvestSignal {
  md5_hash: string;
  title: string;
  company: string;
  url: string;
  description: string;
  niche: VaNiche;
  sourcePlatform: string;
  region: string;
  salary?: string | null;
  tier_hint?: number;
  metadata?: Record<string, any>;
}
