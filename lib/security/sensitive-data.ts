import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type SensitiveClientData = {
  allergies: string;
  sensitivities: string;
  medications: string;
  pregnancy: string;
  previousProcedures: string;
  restrictions: string;
  contraindications: string;
  importantNotes: string;
};

function encryptionKey() {
  const encoded = process.env.SENSITIVE_DATA_KEY;
  if (!encoded) throw new Error("A chave para dados sensíveis não foi configurada.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("A chave para dados sensíveis precisa ter 32 bytes.");
  return key;
}

export function encryptSensitiveData(data: SensitiveClientData) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSensitiveData(payload: string): SensitiveClientData {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Formato de dados sensíveis inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const cleartext = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(cleartext) as SensitiveClientData;
}

export function emptySensitiveClientData(): SensitiveClientData {
  return { allergies: "", sensitivities: "", medications: "", pregnancy: "", previousProcedures: "", restrictions: "", contraindications: "", importantNotes: "" };
}
