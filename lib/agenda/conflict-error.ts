export function isSchedulingConflictError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = String(error.code);
  if (["P2002", "P2034", "P2010"].includes(code)) return true;
  if (code !== "P2039") return false;

  try {
    return JSON.stringify("meta" in error ? error.meta : null).includes("23P01");
  } catch {
    return false;
  }
}
