import { config } from "../packages/config";

type Budget = {
  githubMinutesPerRun: number;
  githubIncludedMinutesPerMonth: number;
  cloudflareIncludedRequestsPerDay: number;
  cloudflareIncludedCpuMsPerDay: number;
  githubRunsPerDay: number;
  cloudflareRunsPerDay: number;
  hunterUrlsPerRun: number;
  aiExtractionsPerRun: number;
  avgAiCallsPerExtraction: number;
  inngestEventsPerJob: number;
};

const budget: Budget = {
  // Tune these assumptions to your real telemetry.
  githubMinutesPerRun: Number(process.env.GH_MIN_PER_RUN || 1.5),
  githubIncludedMinutesPerMonth: Number(process.env.GH_INCLUDED_MIN_PER_MONTH || 2000),
  cloudflareIncludedRequestsPerDay: Number(process.env.CF_REQ_PER_DAY || 100000),
  cloudflareIncludedCpuMsPerDay: Number(process.env.CF_CPU_MS_PER_DAY || 3600000),
  githubRunsPerDay: Number(process.env.GH_RUNS_PER_DAY || 48), // 30-min cadence
  cloudflareRunsPerDay: Number(process.env.CF_RUNS_PER_DAY || 144), // 10-min cadence
  hunterUrlsPerRun: Number(process.env.HUNTER_URLS_PER_RUN || 1), // current worker claims 1 ghost per call
  aiExtractionsPerRun: Number(process.env.AI_EXTRACT_PER_RUN || 15), // pantry.poll claims 15
  avgAiCallsPerExtraction: Number(process.env.AI_CALLS_PER_EXTRACT || 2), // retries/fallbacks
  inngestEventsPerJob: Number(process.env.INNGEST_EVENTS_PER_JOB || 2), // poll+sweep-ish
};

const feedsConfigured = config.rss_sources.length + config.json_sources.length + 5; // + reddit feeds
const githubMinutesDay = budget.githubMinutesPerRun * budget.githubRunsPerDay;
const githubMinutesMonth = githubMinutesDay * 30;
const githubPctOfMonthlyFree = (githubMinutesMonth / budget.githubIncludedMinutesPerMonth) * 100;

const cloudflareRequestsDay = budget.cloudflareRunsPerDay * budget.hunterUrlsPerRun;
// rough estimate: one fetch supabase claim + one fetch source + one patch + one inngest notify
const cloudflareSubrequestsDay = cloudflareRequestsDay * 4;
const cloudflareCpuMsDay = cloudflareRequestsDay * 150;

const aiCallsDay = budget.cloudflareRunsPerDay * budget.aiExtractionsPerRun * budget.avgAiCallsPerExtraction;
const inngestEventsDay = budget.cloudflareRunsPerDay * budget.aiExtractionsPerRun * budget.inngestEventsPerJob;

console.log("=== V12 Free Tier Budget Estimator ===");
console.log(`Configured feed endpoints: ${feedsConfigured}`);
console.log(`Cadence: GitHub ${budget.githubRunsPerDay}/day, Cloudflare ${budget.cloudflareRunsPerDay}/day`);
console.log("");
console.log("[GitHub Actions]");
console.log(`- Est. minutes/day: ${githubMinutesDay.toFixed(1)}`);
console.log(`- Est. minutes/month: ${githubMinutesMonth.toFixed(1)}`);
console.log(`- Included minutes/month assumption: ${budget.githubIncludedMinutesPerMonth}`);
console.log(`- Free-tier usage: ${githubPctOfMonthlyFree.toFixed(1)}%`);
console.log(githubPctOfMonthlyFree > 100
  ? "- Verdict: EXCEEDS free tier. Use lighter runner cadence or move scheduling to Cloudflare/Inngest."
  : "- Verdict: Within free tier.");
console.log("");
console.log("[Cloudflare Worker]");
console.log(`- Hunter requests/day: ${cloudflareRequestsDay}`);
console.log(`- Est. subrequests/day: ${cloudflareSubrequestsDay}`);
console.log(`- Est. CPU ms/day: ${cloudflareCpuMsDay}`);
console.log(`- Included requests/day assumption: ${budget.cloudflareIncludedRequestsPerDay}`);
console.log(`- Included CPU ms/day assumption: ${budget.cloudflareIncludedCpuMsPerDay}`);
console.log(
  cloudflareRequestsDay > budget.cloudflareIncludedRequestsPerDay ||
  cloudflareCpuMsDay > budget.cloudflareIncludedCpuMsPerDay
    ? "- Verdict: EXCEEDS free tier."
    : "- Verdict: Within free tier."
);
console.log("");
console.log("[Pipeline Throughput Potential]");
console.log(`- Est. AI extraction attempts/day: ${aiCallsDay}`);
console.log(`- Est. Inngest events/day: ${inngestEventsDay}`);
console.log("- Note: Final plated jobs/day is limited by source novelty, sieve rejection rate, and hydration success.");
