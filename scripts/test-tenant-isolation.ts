// Compatibility entry point; all database access goes through the safety gate.
process.argv[2] = "tenant";
await import("./validate-predeploy");
export {};
