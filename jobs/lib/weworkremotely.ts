import * as cheerio from "cheerio";
import { stripJunk } from "../../apps/frontend/src/lib/ai/waterfall";

/**
 * WeWorkRemotely Harvester (V12)
 * Pure Signal Emission.
 */
export async function fetchWeWorkRemotelyJobs() {
  try {
    const targetUrl = "https://weworkremotely.com/remote-jobs";
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
        console.error(`[harvest] WeWorkRemotely: HTTP ${response.status}`);
        return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jobs: any[] = [];
    
    // Select the first 10 jobs (V12 allows more than the legacy 3)
    $("section.jobs li a").slice(0, 10).each((_, el) => {
      const $el = $(el);
      const title = $el.find(".title").first().text().trim();
      const company = $el.find(".company").first().text().trim();
      const url = "https://weworkremotely.com" + ($el.attr("href") || "");
      
      if (title && company) {
        const rawContent = $el.html() || "";
        const sanitizedHtml = stripJunk(rawContent);

        jobs.push({
          title,
          company,
          sourceUrl: url,
          description: sanitizedHtml,
        });
      }
    });

    return jobs;
  } catch (err: any) {
    console.error(`[harvest] WeWorkRemotely failed: ${err.message}`);
    return [];
  }
}
