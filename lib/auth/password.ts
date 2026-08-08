import { hash, verify } from "@node-rs/argon2";

const options = {
  algorithm: 2,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string) {
  return hash(password, options);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}
