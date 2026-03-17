import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "va-freelance-hub",
  runtime: "bun",
  logLevel: "log",
  dirs: ["./jobs"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
