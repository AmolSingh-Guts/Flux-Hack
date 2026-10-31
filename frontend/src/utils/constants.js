export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
});

export const STAFF_PERMISSIONS = Object.freeze([
  { key: 'customers', label: 'Customers', description: 'View and manage customer records.' },
  { key: 'quotations', label: 'Quotations', description: 'Create and send quotations.' },
  { key: 'subscriptions', label: 'Subscriptions', description: 'Manage subscription lifecycle.' },
  { key: 'invoices', label: 'Invoices', description: 'Create and manage invoices.' },
  { key: 'payments', label: 'Payments', description: 'Record and void payments.' },
]);

export const BILLING_FREQUENCIES = Object.freeze([
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]);

export const PAYMENT_METHODS = Object.freeze([
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
]);

export const CUSTOMER_STATUSES = Object.freeze(['ACTIVE', 'INACTIVE', 'ARCHIVED']);

export const SUBSCRIPTION_STATUSES = Object.freeze([
  'DRAFT',
  'QUOTATION',
  'CONFIRMED',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
]);

export const INVOICE_STATUSES = Object.freeze([
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

export const QUOTATION_STATUSES = Object.freeze([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
]);

export const STATUS_STYLES = Object.freeze({
  ACTIVE: 'emerald',
  INACTIVE: 'slate',
  ARCHIVED: 'slate',
  DRAFT: 'slate',
  QUOTATION: 'violet',
  CONFIRMED: 'blue',
  SENT: 'blue',
  ACCEPTED: 'emerald',
  REJECTED: 'rose',
  EXPIRED: 'amber',
  PAUSED: 'amber',
  CLOSED: 'slate',
  PARTIALLY_PAID: 'amber',
  PAID: 'emerald',
  OVERDUE: 'rose',
  CANCELLED: 'rose',
  SUCCESS: 'emerald',
  SKIPPED: 'amber',
  ERROR: 'rose',
  COMPLETED: 'emerald',
  VOID: 'slate',
  PENDING: 'amber',
  FAILED: 'rose',
  VERIFIED: 'emerald',
});

export const ROLE_HOME = Object.freeze({
  ADMIN: '/admin/dashboard',
  STAFF: '/staff/dashboard',
  CUSTOMER: '/portal/dashboard',
});

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
