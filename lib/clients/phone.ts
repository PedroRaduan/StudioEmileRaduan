export function normalizeBrazilianPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;

  const nationalNumber = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;

  return `+${nationalNumber.length === 10 || nationalNumber.length === 11 ? `55${nationalNumber}` : digits}`;
}
