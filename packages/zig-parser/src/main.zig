/// VA Freelance Hub — Zig HTML Parser
///
/// Reads raw HTML from stdin, extracts job listing data,
/// and outputs newline-delimited JSON to stdout.
///
/// Each line is a JSON object:
/// {"title":"...", "company":"...", "url":"...", "date":"...", "description":"..."}
///
/// Phase 1: Targets OnlineJobs.ph job listing HTML structure.
/// Extend src/main.zig for additional HTML sources as needed.

const std = @import("std");
const mem = std.mem;
const json = std.json;

const JobItem = struct {
    title: []const u8 = "",
    company: []const u8 = "",
    url: []const u8 = "",
    date: []const u8 = "",
    description: []const u8 = "",
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const stdin = std.io.getStdIn();
    const stdout = std.io.getStdOut();
    const stderr = std.io.getStdErr();

    // Read all stdin (raw HTML)
    const html = try stdin.reader().readAllAlloc(allocator, 50 * 1024 * 1024); // 50MB max
    defer allocator.free(html);

    if (html.len == 0) {
        try stderr.writer().print("zig-parser: empty input\n", .{});
        std.process.exit(1);
    }

    // Extract job items from HTML
    var items = std.ArrayList(JobItem).init(allocator);
    defer items.deinit();

    try extractJobItems(allocator, html, &items);

    // Output as newline-delimited JSON
    const writer = stdout.writer();
    for (items.items) |item| {
        try json.stringify(item, .{}, writer);
        try writer.writeByte('\n');
    }
}

/// Minimal HTML extraction — finds job card patterns in OnlineJobs.ph HTML.
/// This is intentionally simple for v1; extend for more complex sources.
fn extractJobItems(allocator: mem.Allocator, html: []const u8, items: *std.ArrayList(JobItem)) !void {
    // Look for <h2 class="job-title"> or <a class="job-title"> patterns
    // and extract surrounding context for each hit.
    // This is a heuristic extractor — not a full DOM parser.

    var pos: usize = 0;
    var count: usize = 0;
    const max_items = 100;

    while (pos < html.len and count < max_items) {
        // Find a job title anchor — OnlineJobs.ph pattern
        const title_marker = "job_title";
        const found = mem.indexOfPos(u8, html, pos, title_marker) orelse break;

        // Walk forward to find the closing > of the tag
        const tag_start = mem.lastIndexOf(u8, html[0..found], "<") orelse {
            pos = found + title_marker.len;
            continue;
        };

        const tag_end = mem.indexOfPos(u8, html, found, ">") orelse {
            pos = found + title_marker.len;
            continue;
        };

        // Extract href from the tag
        const tag = html[tag_start .. tag_end + 1];
        const href = extractAttr(tag, "href") orelse "";

        // Extract text content between > and </
        const text_start = tag_end + 1;
        const text_end = mem.indexOfPos(u8, html, text_start, "</") orelse {
            pos = found + title_marker.len;
            continue;
        };

        const raw_title = mem.trim(u8, html[text_start..text_end], " \t\r\n");
        if (raw_title.len == 0) {
            pos = found + title_marker.len;
            continue;
        }

        const title = try allocator.dupe(u8, raw_title);
        const url = if (href.len > 0) try std.fmt.allocPrint(
            allocator,
            "https://www.onlinejobs.ph{s}",
            .{href},
        ) else try allocator.dupe(u8, "");

        try items.append(.{
            .title = title,
            .url = url,
            .company = "",
            .date = "",
            .description = "",
        });

        count += 1;
        pos = text_end + 2;
    }
}

/// Extracts attribute value from an HTML tag string.
/// e.g. extractAttr(`<a href="/foo" class="bar">`, "href") => "/foo"
fn extractAttr(tag: []const u8, attr: []const u8) ?[]const u8 {
    const search = attr;
    const idx = mem.indexOf(u8, tag, search) orelse return null;
    const after_attr = tag[idx + search.len ..];

    // Find the = sign
    const eq_idx = mem.indexOfScalar(u8, after_attr, '=') orelse return null;
    const after_eq = mem.trimLeft(u8, after_attr[eq_idx + 1 ..], " ");

    if (after_eq.len == 0) return null;

    // Handle quoted or unquoted values
    if (after_eq[0] == '"' or after_eq[0] == '\'') {
        const quote = after_eq[0];
        const val_start = 1;
        const val_end = mem.indexOfScalar(u8, after_eq[val_start..], quote) orelse return null;
        return after_eq[val_start .. val_start + val_end];
    }

    // Unquoted: ends at space or >
    var end: usize = 0;
    while (end < after_eq.len and after_eq[end] != ' ' and after_eq[end] != '>') : (end += 1) {}
    return after_eq[0..end];
}
