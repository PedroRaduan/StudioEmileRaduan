import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSensitiveData, encryptSensitiveData, type SensitiveClientData } from "../lib/security/sensitive-data";

const example: SensitiveClientData = { allergies: "Relato de teste", sensitivities: "", medications: "", pregnancy: "", previousProcedures: "", restrictions: "", contraindications: "", importantNotes: "Informação fictícia" };
let previousKey: string | undefined;

describe("proteção de dados sensíveis", () => {
  beforeEach(() => { previousKey = process.env.SENSITIVE_DATA_KEY; process.env.SENSITIVE_DATA_KEY = Buffer.alloc(32, 7).toString("base64"); });
  afterEach(() => { if (previousKey === undefined) delete process.env.SENSITIVE_DATA_KEY; else process.env.SENSITIVE_DATA_KEY = previousKey; });

  it("criptografa sem manter o conteúdo em texto aberto", () => {
    const encrypted = encryptSensitiveData(example);
    expect(encrypted).not.toContain(example.allergies);
    expect(decryptSensitiveData(encrypted)).toEqual(example);
  });

  it("rejeita conteúdo adulterado", () => {
    const encrypted = encryptSensitiveData(example);
    expect(() => decryptSensitiveData(`${encrypted.slice(0, -1)}A`)).toThrow();
  });
});
