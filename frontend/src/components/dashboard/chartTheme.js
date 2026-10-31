export const chartColors = {
  brand: '#257beb',
  brandLight: '#93d0fd',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
  slate: '#64748b',
};

export const statusColor = {
  DRAFT: chartColors.slate,
  CONFIRMED: chartColors.brand,
  PARTIALLY_PAID: chartColors.amber,
  PAID: chartColors.emerald,
  OVERDUE: chartColors.rose,
  CANCELLED: '#94a3b8',
};

export const paymentMethodColor = {
  CASH: chartColors.emerald,
  BANK_TRANSFER: chartColors.brand,
  UPI: chartColors.violet,
  CARD: chartColors.amber,
  OTHER: chartColors.slate,
};

export function compactCurrency(value) {
  const amount = Number(value ?? 0);

  if (Math.abs(amount) >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  }

  if (Math.abs(amount) >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1_000) {
    return `₹${(amount / 1_000).toFixed(1)}k`;
  }

  return `₹${amount.toFixed(0)}`;
}
