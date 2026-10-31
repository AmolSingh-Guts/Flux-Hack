import {
  BadgePercent,
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  Repeat,
  Settings,
  UserCircle,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

const permissionFor = {
  customers: 'customers',
  quotations: 'quotations',
  subscriptions: 'subscriptions',
  invoices: 'invoices',
  payments: 'payments',
};

function canAccess(user, permission) {
  if (!user) {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true;
  }

  return user.role === 'STAFF' && (user.permissions ?? []).includes(permission);
}

export function navigationFor(user) {
  if (!user) {
    return [];
  }

  if (user.role === 'CUSTOMER') {
    return [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', to: '/portal/dashboard', icon: LayoutDashboard },
        ],
      },
      {
        label: 'Billing',
        items: [
          { label: 'Subscriptions', to: '/portal/subscriptions', icon: Repeat },
          { label: 'Invoices', to: '/portal/invoices', icon: Receipt },
          { label: 'Payments', to: '/portal/payments', icon: Wallet },
        ],
      },
      {
        label: 'Account',
        items: [{ label: 'Profile', to: '/portal/profile', icon: UserCircle }],
      },
    ];
  }

  const base = user.role === 'ADMIN' ? '/admin' : '/staff';
  const sections = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', to: `${base}/dashboard`, icon: LayoutDashboard },
      ],
    },
  ];

  const customers = [];
  if (canAccess(user, permissionFor.customers)) {
    customers.push({ label: 'Customers', to: `${base}/customers`, icon: Users });
  }
  if (user.role === 'ADMIN') {
    customers.push({ label: 'Staff', to: `${base}/staff`, icon: UserCog });
  }
  if (customers.length) {
    sections.push({ label: 'People', items: customers });
  }

  if (user.role === 'ADMIN') {
    sections.push({
      label: 'Catalog',
      items: [
        { label: 'Products', to: `${base}/products`, icon: Package },
        { label: 'Plans', to: `${base}/plans`, icon: CreditCard },
      ],
    });
  }

  const billing = [];
  if (canAccess(user, permissionFor.quotations)) {
    billing.push({ label: 'Quotations', to: `${base}/quotations`, icon: FileText });
  }
  if (canAccess(user, permissionFor.subscriptions)) {
    billing.push({ label: 'Subscriptions', to: `${base}/subscriptions`, icon: Repeat });
  }
  if (canAccess(user, permissionFor.invoices)) {
    billing.push({ label: 'Invoices', to: `${base}/invoices`, icon: Receipt });
  }
  if (canAccess(user, permissionFor.payments)) {
    billing.push({ label: 'Payments', to: `${base}/payments`, icon: Wallet });
  }
  if (billing.length) {
    sections.push({ label: 'Billing', items: billing });
  }

  if (user.role === 'ADMIN') {
    sections.push({
      label: 'Finance',
      items: [
        { label: 'Taxes', to: `${base}/taxes`, icon: Percent },
        { label: 'Discounts', to: `${base}/discounts`, icon: BadgePercent },
        { label: 'Reports', to: `${base}/reports`, icon: BarChart3 },
      ],
    });
    sections.push({
      label: 'System',
      items: [
        { label: 'Settings', to: `${base}/settings`, icon: Settings },
        { label: 'My profile', to: `${base}/profile`, icon: UserCircle },
      ],
    });
  } else {
    sections.push({
      label: 'Account',
      items: [{ label: 'My profile', to: `${base}/profile`, icon: UserCircle }],
    });
  }

  return sections;
}

export { canAccess };
