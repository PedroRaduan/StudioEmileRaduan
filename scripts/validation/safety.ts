export class ValidationFailure extends Error {}

type Environment = Record<string, string | undefined>;

export function validationTarget(env: Environment) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new ValidationFailure("Validação recusada em ambiente de produção.");
  }
  if (!["local", "ci", "staging"].includes(env.VALIDATION_ENV ?? "")) {
    throw new ValidationFailure("Defina VALIDATION_ENV como local, ci ou staging.");
  }
  if (env.VALIDATION_DB_ACK !== "dedicated-non-production-database") {
    throw new ValidationFailure("Confirme o uso de banco exclusivo de validação em VALIDATION_DB_ACK.");
  }
  let url: URL;
  try { url = new URL(env.VALIDATION_DATABASE_URL ?? ""); }
  catch { throw new ValidationFailure("VALIDATION_DATABASE_URL ausente ou inválida."); }
  const database = url.pathname.slice(1);
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !/^agenda_validation(?:_[a-z0-9_]+)?$/.test(database) ||
      url.username !== "agenda_validation" || !url.password || url.hash) {
    throw new ValidationFailure("Use PostgreSQL, usuário agenda_validation e banco agenda_validation ou agenda_validation_<sufixo>.");
  }
  // Do not permit query parameters to silently override host, user or database.
  for (const key of url.searchParams.keys()) {
    if (key !== "sslmode") throw new ValidationFailure("Somente sslmode é permitido nos parâmetros da URL de validação.");
  }
  if (url.searchParams.getAll("sslmode").length > 1) throw new ValidationFailure("sslmode duplicado.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && (env.VALIDATION_ENV !== "staging" || env.VALIDATION_ALLOWED_HOST !== url.hostname)) {
    throw new ValidationFailure("Banco remoto exige staging e VALIDATION_ALLOWED_HOST com o hostname exato.");
  }
  if (!local && !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) {
    throw new ValidationFailure("Banco de staging remoto exige TLS verificado.");
  }
  return { url: url.toString(), host: url.hostname, database, user: url.username };
}

export function safeFailure(error: unknown) {
  return error instanceof ValidationFailure ? error.message : "Falha inesperada de infraestrutura ou execução. Validação bloqueada; nenhuma aprovação foi emitida.";
}
