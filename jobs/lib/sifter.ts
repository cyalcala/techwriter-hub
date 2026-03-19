/**
 * Intelligent Job Sifter (JS Version)
 * Categorizes and filters jobs before they reach the database.
 */
import { siftNative, OpportunityTier as NativeTier } from "../../packages/sifter-native/index";
import { config } from "@va-hub/config";

export enum OpportunityTier {
  GOLD = 1,      // PH-focused / High-Accessibility
  SILVER = 2,    // Global Remote / Entry
  BRONZE = 3,    // General
  TRASH = 4      // Regional-locked / Ultra-Senior Tech / Non-English
}

const C_LEVEL_KILLS = config.kill_lists.titles; // Shared with tech/exec in config
const TECH_KILLS = config.kill_lists.titles;   // Simplified for now
const REGIONAL_KILLS = config.kill_lists.content;
const SEA_SIGNALS = config.target_signals.region;
const REMOTE_SIGNALS = config.target_signals.remote;
const ROLE_SIGNALS = config.target_signals.role;

export function siftOpportunity(title: string, company: string, description: string, sourcePlatform?: string): OpportunityTier {
  const t = title.toLowerCase();
  const c = company.toLowerCase();
  const d = (description || "").toLowerCase();
  const s = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${c} ${d} ${s}`;

  // 0. TITANIUM HARD PURGE (Zig-Powered)
  // This kills 100% of tech/exec noise before we even run regex.
  const nativeResult = siftNative(title, company, description || "");
  if (nativeResult === NativeTier.TRASH) return OpportunityTier.TRASH;

  // 1. Target Categories
  const isTargetCategory = ROLE_SIGNALS.some(sig => t.includes(sig));

  // 2. Hard Tech Kill
  if (TECH_KILLS.some(tk => t.includes(tk)) && !t.includes("support")) return OpportunityTier.TRASH;

  // 3. Absolute Leadership Kill (C-Suite/Global Exec)
  const cSuite = ["ceo", "cto", "vp", "vice president", "director", "president", "head of", "principal", "staff", "researcher"];
  if (cSuite.some(l => t.includes(l)) && !vaSignals.some(va => t.includes(va))) return OpportunityTier.TRASH;

  // 4. Regional Kill
  if (REGIONAL_KILLS.some(k => body.includes(k) && !SEA_SIGNALS.some(sea => body.includes(sea)) && !REMOTE_SIGNALS.some(r => body.includes(r)))) return OpportunityTier.TRASH;

  // 5. Tiering with Contextual Demotion
  const hasSeaSignal = SEA_SIGNALS.some(sea => body.includes(sea));
  const hasRemoteSignal = REMOTE_SIGNALS.some(r => body.includes(r));
  const phFocusedSource = ["reddit", "onlinejobs", "direct", "manual", "pinoy", "filipino"];
  const isPhContext = hasSeaSignal || phFocusedSource.some(src => s.includes(src));
  
  const isGlobalLeadership = ["senior", "manager", "lead", "specialist"].some(l => t.includes(l)) && !phFocusedSource.some(src => s.includes(src)) && !config.target_signals.role.some(va => t.includes(va));

  if (isTargetCategory && (isPhContext || hasRemoteSignal)) {
    if (isGlobalLeadership) return OpportunityTier.SILVER;
    return isPhContext ? OpportunityTier.GOLD : OpportunityTier.SILVER;
  }

  return OpportunityTier.TRASH;
}



