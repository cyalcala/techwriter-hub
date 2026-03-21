import { tasks, configure } from "@trigger.dev/sdk/v3";

configure({
  secretKey: "tr_pat_a7mkhwwu9pu1a5k16gkhrr6ewwiy3rphy5a436db",
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
