const std = @import("std");

// VA.INDEX TITANIUM SIEVE - Parametric Native Sifter Module
// Purpose: Dynamic, zero-recompile sifting for the Niche Factory.

const SiftResult = enum(u8) {
    GOLD = 1,
    SILVER = 2,
    BRONZE = 3,
    TRASH = 4,
};

export fn sift_job(
    title_ptr: [*c]const u8, 
    company_ptr: [*c]const u8, 
    desc_ptr: [*c]const u8,
    kills_ptr: [*c]const u8,   // pipe-delimited: "eng|dev|ceo"
    signals_ptr: [*c]const u8  // pipe-delimited: "va|admin|support"
) u8 {
    const title = std.mem.span(title_ptr);
    const company = std.mem.span(company_ptr);
    const desc = std.mem.span(desc_ptr);
    const kills_raw = std.mem.span(kills_ptr);
    const signals_raw = std.mem.span(signals_ptr);

    var buf: [2048]u8 = undefined;
    const lower_title = std.ascii.lowerString(&buf, title);
    
    // 1. DYNAMIC HARD KILL CHECK
    var kill_iter = std.mem.splitSequence(u8, kills_raw, "|");
    while (kill_iter.next()) |kill| {
        if (kill.len == 0) continue;
        if (std.mem.indexOf(u8, lower_title, kill) != null) return @intFromEnum(SiftResult.TRASH);
    }

    // 2. DYNAMIC TARGET MATCHING
    var matches: u32 = 0;
    var signal_iter = std.mem.splitSequence(u8, signals_raw, "|");
    while (signal_iter.next()) |signal| {
        if (signal.len == 0) continue;
        if (std.mem.indexOf(u8, lower_title, signal) != null) {
            matches += 1;
        }
    }

    // 3. TIER DETERMINATION
    if (matches >= 1) return @intFromEnum(SiftResult.GOLD);
    
    // Fallback info
    _ = company;
    _ = desc;

    return @intFromEnum(SiftResult.SILVER);
}
