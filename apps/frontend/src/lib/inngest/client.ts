import { Inngest } from "inngest";

// Verifying keys for V12 Handshake
const eventKey = process.env.INNGEST_EVENT_KEY;
const signingKey = process.env.INNGEST_SIGNING_KEY;

export const inngest = new Inngest({ 
  id: "va-freelance-hub",
  eventKey,
});
