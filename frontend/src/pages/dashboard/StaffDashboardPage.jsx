import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  FileText,
  Receipt,
  Repeat,
  Users,
  Wallet,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import RangeFilter from '../../components/dashboard/RangeFilter.jsx';
import { staffDashboard } from '../../api/dashboard.api.js';
import useAsync from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { STAFF_PERMISSIONS } from '../../utils/constants.js';
import {
  addDaysInputValue,
  formatCurrency,
  formatDate,
  monthStartInputValue,
} from '../../utils/format.js';

const empty = {
  cards: {},
  permissions: [],
  recentSubscriptions: [],
  recentInvoices: [],
};

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const initial = useMemo(
    () => ({ from: monthStartInputValue(), to: addDaysInputValue(0) }),
    [],
  );
  const [draft, setDraft] = useState(initial);
  const [range, setRange] = useState(initial);

  const { data, loading, error, reload } = useAsync(
    () => staffDashboard(range),
    [range.from, range.to],
  );
  const dashboard = data ?? empty;
  const cards = dashboard.cards;
  const granted = dashboard.permissions ?? [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'team'}`}
        description="Your workspace for customers, quotations, subscriptions, invoices, and payments."
        actions={
          <RangeFilter
            from={draft.from}
            to={draft.to}
            onFromChange={(value) => setDraft((current) => ({ ...current, from: value }))}
            onToChange={(value) => setDraft((current) => ({ ...current, to: value }))}
            onApply={() => setRange(draft)}
            onReset={() => {
              setDraft(initial);
              setRange(initial);
            }}
            loading={loading}
          />
        }
      />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Your access
              </span>
              {granted.length === 0 ? (
                <Badge tone="amber">No module permissions assigned</Badge>
              ) : (
                STAFF_PERMISSIONS.filter((permission) => granted.includes(permission.key)).map(
                  (permission) => (
                    <Badge key={permission.key} tone="brand">
                      {permission.label}
                    </Badge>
                  ),
                )
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Customers"
              value={cards.totalCustomers ?? 0}
              hint={`${cards.newCustomers ?? 0} new in range`}
              icon={Users}
              tone="brand"
              loading={loading}
            />
            <StatCard
              label="Quotations in range"
              value={cards.totalQuotations ?? 0}
              hint={`${cards.openQuotations ?? 0} open · ${cards.acceptedQuotations ?? 0} accepted`}
              icon={FileText}
              tone="violet"
              loading={loading}
            />
            <StatCard
              label="Subscriptions in range"
              value={cards.totalSubscriptions ?? 0}
              hint={`${cards.activeSubscriptions ?? 0} active`}
              icon={Repeat}
              tone="emerald"
              loading={loading}
            />
            <StatCard
              label="Invoices in range"
              value={cards.totalInvoices ?? 0}
              hint={`${cards.overdueInvoices ?? 0} overdue`}
              icon={Receipt}
              tone="amber"
              loading={loading}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(cards.outstandingAmount)}
              hint="Confirmed, partial, and overdue balances"
              icon={Banknote}
              tone="rose"
              loading={loading}
            />
            <StatCard
              label="Payments recorded"
              value={cards.paymentsRecorded ?? 0}
              hint={formatCurrency(cards.paymentsAmount)}
              icon={Wallet}
              tone="emerald"
              loading={loading}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Recent subscriptions"
                description="Newest records across the business."
                actions={
                  <Link to="/staff/subscriptions" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                    View all
                  </Link>
                }
              />
              <CardBody className="p-0">
                {dashboard.recentSubscriptions.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">No subscriptions yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {dashboard.recentSubscriptions.map((subscription) => (
                      <li key={subscription.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <Link to={`/staff/subscriptions/${subscription.id}`} className="truncate text-sm font-medium text-slate-900 hover:text-brand-600">
                            {subscription.subscription_number}
                          </Link>
                          <p className="truncate text-xs text-slate-500">
                            {subscription.customer_name} · {subscription.plan_name}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge status={subscription.status} />
                          <p className="mt-1 text-xs text-slate-500">{formatDate(subscription.start_date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Recent invoices"
                description="Latest billing activity."
                actions={
                  <Link to="/staff/invoices" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                    View all
                  </Link>
                }
              />
              <CardBody className="p-0">
                {dashboard.recentInvoices.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">No invoices yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {dashboard.recentInvoices.map((invoice) => (
                      <li key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <Link to={`/staff/invoices/${invoice.id}`} className="truncate text-sm font-medium text-slate-900 hover:text-brand-600">
                            {invoice.invoice_number}
                          </Link>
                          <p className="truncate text-xs text-slate-500">
                            {invoice.customer_name} · due {formatDate(invoice.due_date)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium text-slate-900">
                            {formatCurrency(invoice.balance_due, invoice.currency)}
                          </p>
                          <Badge status={invoice.status} className="mt-1" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="text-xs text-slate-400">
            Range {formatDate(range.from)} – {formatDate(range.to)}. All figures are computed from live records.
          </p>
        </div>
      )}
    </div>
  );
}
