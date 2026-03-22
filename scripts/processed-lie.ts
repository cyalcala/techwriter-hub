async function check() {
  const secret = process.env.TRIGGER_SECRET_KEY;
  const url = "https://api.trigger.dev/api/v1/runs?status=COMPLETED&limit=10";
  
  console.log("=== THE PROCESSED COUNT LIE ===");
  try {
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${secret}` }
    });
    const { data } = await res.json();
    const runs = data
      .filter((r: any) => r.taskIdentifier === "harvest-opportunities")
      .slice(0, 5)
      .map((r: any) => {
        const p = r.output?.processed || 0;
        const n = r.output?.newCount || 0;
        const ratio = p > 0 ? Math.round((n / p) * 100) : 0;
        return {
          id: r.id,
          completedAt: r.updatedAt,
          processed: p,
          new: n,
          refreshed: p - n,
          truthRatio: `${ratio}%`
        };
      });
    
    console.table(runs);
    
    const avgTruth = runs.reduce((acc: number, r: any) => acc + parseInt(r.truthRatio), 0) / runs.length;
    console.log(`\nAVERAGE TRUTH RATIO: ${Math.round(avgTruth)}%`);
    
    if (avgTruth < 20) {
      console.log("🚨 FAKERY DETECTED: The system is mostly REFRESHING old data (80%+).");
    } else {
      console.log(`✅ Pipeline is adding significant new data (${Math.round(avgTruth)}%).`);
    }
  } catch (e: any) {
    console.error("FAIL:", e.message);
  }
}

check();
