import { schedules, logger } from "@trigger.dev/sdk/v3";
import { Inngest } from "inngest";
import * as cheerio from "cheerio";

// 1. Initialize Minimal Inngest Client for Emitter
const inngest = new Inngest({ 
  id: "va-freelance-hub-emitter",
  eventKey: process.env.INNGEST_EVENT_KEY 
});

export const hourlyHarvest = schedules.task({
  id: "hourly-harvest",
  cron: "0 * * * *",
  maxDuration: 120,
  queue: { concurrencyLimit: 1 },
  run: async () => {
    try {
      const targetUrl = "https://weworkremotely.com/remote-jobs";
      
      // 2. Harvesting (Not Scraping) - Capture public signals
      const response = await fetch(targetUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      // 3. Extract logic (Lightweight)
      const jobs: any[] = [];
      
      // Select the first 3 jobs to minimize payload/compute
      $("section.jobs li a").slice(0, 3).each((_, el) => {
        const $el = $(el);
        const title = $el.find(".title").text().trim();
        const company = $el.find(".company").text().trim();
        const url = "https://weworkremotely.com" + ($el.attr("href") || "");
        
        if (title && company) {
          jobs.push({
            name: "job.harvested",
            data: {
              raw_title: title,
              raw_company: company,
              raw_url: url,
              raw_html: $el.html() || "", // Lightweight snippet
            },
          });
        }
      });

      // 4. Emit to Event Bus (The Baton Pass)
      if (jobs.length > 0) {
        await inngest.send(jobs);
        logger.info("HARVEST_EMITTED", { count: jobs.length });
      }

      return { status: "success", count: jobs.length };

    } catch (err: any) {
      logger.error("HARVEST_FAILED", { error: err.message });
      throw err;
    }
  }
});
