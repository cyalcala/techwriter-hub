import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";
import { config } from "@va-hub/config";
import { existsSync } from "fs";

// Platform-aware library resolution
const isWindows = process.platform === "win32";
const libName = isWindows ? "sifter.dll" : "sifter.so";
const libPath = join(import.meta.dir, libName);

let lib: any = null;

try {
  if (existsSync(libPath)) {
    lib = dlopen(libPath, {
      sift_job: {
        args: [
          FFIType.ptr, // title
          FFIType.ptr, // company
          FFIType.ptr, // desc
          FFIType.ptr, // kills_list
          FFIType.ptr  // signals_list
        ],
        returns: FFIType.u8,
      },
    });
    console.log(`[sifter-native] Native engine loaded: ${libName}`);
  } else {
    console.warn(`[sifter-native] Binary NOT FOUND: ${libPath}. Falling back to JS-only mode.`);
  }
} catch (err: any) {
  console.error(`[sifter-native] FFI LOAD FAILED: ${err.message}. Falling back to JS-only mode.`);
}

export enum OpportunityTier {
  GOLD = 1,
  SILVER = 2,
  BRONZE = 3,
  TRASH = 4,
}

// Pre-join config parameters for efficiency (Cached)
const killsString = [...config.kill_lists.titles, ...config.kill_lists.companies, ...config.kill_lists.content].join("|") + "\0";
const signalsString = config.target_signals.role.join("|") + "\0";

const killsPtr = Buffer.from(killsString);
const signalsPtr = Buffer.from(signalsString);

/**
 * Parametric Native Sifter (Zig-Powered)
 * High-performance substring matching driven by @va-hub/config.
 */
export function siftNative(title: string, company: string, description: string): OpportunityTier {
  if (!lib) {
    // JS Fallback Mode: Always permit if native sifter is unreachable.
    // The JS layer in jobs/lib/sifter.ts will handle the heavy lifting.
    return OpportunityTier.GOLD; 
  }

  const titlePtr = Buffer.from(title + "\0");
  const companyPtr = Buffer.from(company + "\0");
  const descPtr = Buffer.from(description + "\0");

  return lib.symbols.sift_job(
    ptr(titlePtr),
    ptr(companyPtr),
    ptr(descPtr),
    ptr(killsPtr),
    ptr(signalsPtr)
  ) as OpportunityTier;
}
