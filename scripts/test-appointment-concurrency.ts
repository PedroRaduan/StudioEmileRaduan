// Compatibility entry point; all database access goes through the safety gate.
process.argv[2] = "concurrency";
await import("./validate-predeploy");
export {};
