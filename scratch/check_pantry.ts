import { supabase } from "../packages/db/supabase";

async function checkPantry() {
  const { count, error } = await supabase
    .from("raw_job_harvests")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("❌ Pantry Error:", error.message);
  } else {
    console.log(`📊 Pantry Items: ${count}`);
  }

  const { data: statusCounts, error: statusError } = await supabase
    .from("raw_job_harvests")
    .select("status");

  if (!statusError && statusCounts) {
    const stats = statusCounts.reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});
    console.log("📊 Status Breakdown:", stats);
  }
}

checkPantry();
