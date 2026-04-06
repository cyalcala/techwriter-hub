import { startV12Sifter } from "../apps/frontend/src/lib/ai/waterfall";

const payload = {
  raw_title: "Senior GoHighLevel Automator & Writer (PROBE-V2)",
  raw_company: "Omega Mock Agency",
  raw_url: "https://upwork.com/jobs/omega-mock-999-v2",
  raw_html: `
    <div class="job-post">
      <h1>Senior GoHighLevel Automator & Writer</h1>
      <p><strong>Company:</strong> Omega Mock Agency</p>
      <div class="description">
        We need an expert to build complex SaaS workflows in GoHighLevel and write engaging email copy. 
        MUST be located in the Philippines (Manila preferred). 
        Rate is flexible between $15/hr to $30/hr depending on experience. 
        Start date ASAP.
      </div>
    </div>
  `,
  source: "upwork"
};

async function main() {
  console.log("🚀 [OMEGA PROBE] INITIALIZING END-TO-END DIAGNOSTIC (STALLION-V2)");
  console.log("--------------------------------------------------");
  try {
    const result = await startV12Sifter(payload);
    console.log("--------------------------------------------------");
    console.log("🏁 [OMEGA PROBE] COMPLETE");
    console.log("FINAL STATUS:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("❌ [OMEGA PROBE] CRITICAL FAILURE");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
