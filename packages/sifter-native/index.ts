import { dlopen, FFIType, ptr } from "bun:ffi";
import { join } from "path";

// Locate the native library
const libPath = join(import.meta.dir, "zig-out", "bin", "sifter.dll");

// Load the library
const lib = dlopen(libPath, {
  sift_job: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.u8,
  },
});

export enum OpportunityTier {
  GOLD = 1,
  SILVER = 2,
  BRONZE = 3,
  TRASH = 4,
}

/**
 * Native Sifter (Zig-Powered)
 * High-performance substring matching with zero GC overhead.
 */
export function siftNative(title: string, company: string, description: string): OpportunityTier {
  const enc = new TextEncoder();
  const titlePtr = Buffer.from(title + "\0");
  const companyPtr = Buffer.from(company + "\0");
  const descPtr = Buffer.from(description + "\0");

  return lib.symbols.sift_job(
    ptr(titlePtr),
    ptr(companyPtr),
    ptr(descPtr)
  ) as OpportunityTier;
}
