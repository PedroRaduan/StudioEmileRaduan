import { hash, verify } from "@node-rs/argon2";

const options = {
  algorithm: 2,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

// Evita diferença mensurável entre um usuário existente e um inexistente.
const dummyHash = hash("credencial-inexistente-para-comparacao", options);

export function hashPassword(password: string) {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string | null | undefined, password: string) {
  return verify(passwordHash ?? await dummyHash, password);
}
