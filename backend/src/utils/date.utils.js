const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10);
  }

  throw new Error('Invalid date value.');
}

export function todayString() {
  return toDateOnly(new Date());
}

export function addDays(value, days) {
  const date = new Date(`${toDateOnly(value)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

export function addMonths(value, months) {
  const date = new Date(`${toDateOnly(value)}T00:00:00.000Z`);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return toDateOnly(date);
}

export function addBillingPeriod(value, frequency) {
  switch (frequency) {
    case 'DAILY':
      return addDays(value, 1);
    case 'WEEKLY':
      return addDays(value, 7);
    case 'MONTHLY':
      return addMonths(value, 1);
    case 'YEARLY':
      return addMonths(value, 12);
    default:
      throw new Error(`Unsupported billing frequency: ${frequency}`);
  }
}

export function previousDay(value) {
  return addDays(value, -1);
}

export function differenceInDays(fromValue, toValue) {
  const from = new Date(`${toDateOnly(fromValue)}T00:00:00.000Z`);
  const to = new Date(`${toDateOnly(toValue)}T00:00:00.000Z`);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function isBefore(first, second) {
  return toDateOnly(first) < toDateOnly(second);
}

export function isAfter(first, second) {
  return toDateOnly(first) > toDateOnly(second);
}

export function isPast(value) {
  return toDateOnly(value) < todayString();
}

export function isWithinRange(value, start, end) {
  const date = toDateOnly(value);
  return date >= toDateOnly(start) && date <= toDateOnly(end);
}

export function currentMonthRange() {
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
  );

  return {
    from: toDateOnly(start),
    to: toDateOnly(end),
  };
}

export function normaliseDateRange(from, to) {
  if (from && to && from > to) {
    return { from: to, to: from };
  }

  return { from: from || null, to: to || null };
}
