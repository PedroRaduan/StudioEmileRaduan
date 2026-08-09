export function originMatchesHost(origin: string, host: string) {
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
