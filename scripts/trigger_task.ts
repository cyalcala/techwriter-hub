import { tasks, configure } from "@trigger.dev/sdk/v3";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

async function main() {
  console.log("Attempting to trigger harvest-opportunities via SDK (v3)...");
  try {
    const run = await tasks.trigger("harvest-opportunities", {});
    console.log("Trigger success!");
    console.log("Run ID:", run.id);
  } catch (error) {
    console.error("Trigger failed:");
    console.error(error);
  }
}

main();
