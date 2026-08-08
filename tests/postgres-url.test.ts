import { describe, expect, it } from "vitest";
import { enforcePostgresCertificateVerification } from "../lib/db/postgres-url";

describe("enforcePostgresCertificateVerification", () => {
  it.each(["prefer", "require", "verify-ca"])("torna sslmode=%s explicitamente seguro", (mode) => {
    const url = `postgresql://user:secret@db.example.test/studio?sslmode=${mode}&channel_binding=require`;
    expect(enforcePostgresCertificateVerification(url)).toBe(
      "postgresql://user:secret@db.example.test/studio?sslmode=verify-full&channel_binding=require",
    );
  });

  it("preserva verify-full e URLs sem sslmode", () => {
    const verified = "postgresql://user:secret@db.example.test/studio?sslmode=verify-full";
    const local = "postgresql://user:secret@localhost:5432/studio";
    expect(enforcePostgresCertificateVerification(verified)).toBe(verified);
    expect(enforcePostgresCertificateVerification(local)).toBe(local);
  });
});
