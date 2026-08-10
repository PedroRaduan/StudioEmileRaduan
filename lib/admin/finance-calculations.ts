export function calculateDailyExpected(paymentCents: readonly number[], expenseCents: readonly number[]) {
  return paymentCents.reduce((total, value) => total + value, 0) - expenseCents.reduce((total, value) => total + value, 0);
}
