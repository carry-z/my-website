import { initializeCredentialStore } from "../lib/lab-credential-store.server.mjs";

// Explicit one-time migration, run during build. Runtime code never initializes or resets credentials.
await initializeCredentialStore();
console.log("Administrator credential storage ready (no credentials printed).");
