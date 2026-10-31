const currencyFormatters = new Map();

function formatterFor(currency) {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  }

  return currencyFormatters.get(currency);
}

export function formatCurrency(value, currency = 'INR') {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return formatterFor(currency).format(0);
  }

  return formatterFor(currency).format(amount);
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-IN', options).format(Number(value ?? 0));
}

export function formatDate(value, fallback = '—') {
  if (!value) {
    return fallback;
  }

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value, fallback = '—') {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);

  if (Number.isNaN(days)) {
    return '—';
  }

  if (days === 0) {
    return 'Today';
  }

  if (days === 1) {
    return 'Tomorrow';
  }

  if (days === -1) {
    return 'Yesterday';
  }

  if (days > 0) {
    return `In ${days} days`;
  }

  return `${Math.abs(days)} days ago`;
}

export function titleCase(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function initials(name) {
  if (!name) {
    return '?';
  }

  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 10);
}

export function addDaysInputValue(days, from = todayInputValue()) {
  const date = new Date(`${from}T00:00:00`);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

export function monthStartInputValue() {
  return `${todayInputValue().slice(0, 8)}01`;
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function percent(value) {
  return `${toNumber(value).toFixed(2)}%`;
}
