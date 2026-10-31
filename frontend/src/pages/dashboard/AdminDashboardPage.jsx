import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Receipt,
  Repeat,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import RangeFilter from '../../components/dashboard/RangeFilter.jsx';
import {
  GrowthLineChart,
  RevenueAreaChart,
  StatusPieChart,
} from '../../components/dashboard/charts.jsx';
import { adminDashboard } from '../../api/dashboard.api.js';
import useAsync from '../../hooks/useAsync.js';
import {
  addDaysInputValue,
  formatCurrency,
  formatDate,
  monthStartInputValue,
} from '../../utils/format.js';

const empty = {
  cards: {},
  revenueChart: [],
  subscriptionGrowth: [],
  invoiceStatus: [],
  recentPayments: [],
  recentSubscriptions: [],
  upcomingRenewals: [],
};

export default function AdminDashboardPage() {
  const initial = useMemo(
    () => ({ from: monthStartInputValue(), to: addDaysInputValue(0) }),
    [],
  );
  const [draft, setDraft] = useState(initial);
  const [range, setRange] = useState(initial);

  const { data, loading, error, reload } = useAsync(
    () => adminDashboard(range),
    [range.from, range.to],
  );
  const dashboard = data ?? empty;
  const cards = dashboard.cards;

  return (
    <div className="bg-white">
      <PageHeader
        title="Admin dashboard"
        description="A live view of revenue, subscriptions, receivables, and customer activity."
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Collected in range"
              value={formatCurrency(cards.rangeRevenue)}
              hint={`${formatCurrency(cards.totalRevenue)} all time`}
              icon={Wallet}
              tone="emerald"
              loading={loading}
            />
            <StatCard
              label="Monthly recurring revenue"
              value={formatCurrency(cards.mrr)}
              hint="Normalised from active plans"
              icon={TrendingUp}
              tone="brand"
              loading={loading}
            />
            <StatCard
              label="Active subscriptions"
              value={cards.activeSubscriptions ?? 0}
              hint={`${cards.pausedSubscriptions ?? 0} paused · ${cards.cancelledSubscriptions ?? 0} closed`}
              icon={Repeat}
              tone="violet"
              loading={loading}
            />
            <StatCard
              label="Active customers"
              value={cards.activeCustomers ?? 0}
              hint={`${cards.newCustomers ?? 0} new in range`}
              icon={Users}
              tone="brand"
              loading={loading}
            />
            <StatCard
              label="Outstanding payments"
              value={formatCurrency(cards.pendingPayments)}
              hint={`${cards.pendingPaymentsCount ?? 0} open invoices`}
              icon={Banknote}
              tone="amber"
              loading={loading}
            />
            <StatCard
              label="Overdue invoices"
              value={cards.overdueInvoices ?? 0}
              hint={`${formatCurrency(cards.overdueAmount)} overdue`}
              icon={AlertTriangle}
              tone="rose"
              loading={loading}
            />
            <StatCard
              label="Invoices issued"
              value={cards.totalInvoices ?? 0}
              hint={`${cards.paidInvoices ?? 0} paid · ${cards.draftInvoices ?? 0} draft`}
              icon={Receipt}
              tone="slate"
              loading={loading}
            />
            <StatCard
              label="New subscriptions"
              value={cards.newSubscriptions ?? 0}
              hint="Started in selected range"
              icon={CalendarClock}
              tone="emerald"
              loading={loading}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader
                title="Revenue trend"
                description="Collected payments across the last 12 months."
                actions={
                  <Link to="/admin/reports" className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-navy-600">
                    Reports <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              <CardBody>
                <RevenueAreaChart data={dashboard.revenueChart} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Invoice status" description="Distribution across all invoices." />
              <CardBody>
                <StatusPieChart data={dashboard.invoiceStatus} />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Subscription growth" description="New subscriptions per month." />
              <CardBody>
                <GrowthLineChart data={dashboard.subscriptionGrowth} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Upcoming renewals"
                description="Active subscriptions due for billing."
                actions={
                  <Link to="/admin/subscriptions" className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-navy-600">
                    View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              <CardBody className="p-0">
                {dashboard.upcomingRenewals.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">No upcoming renewals.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {dashboard.upcomingRenewals.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <Link to={`/admin/subscriptions/${item.id}`} className="truncate text-sm font-medium text-navy hover:text-navy-600">
                            {item.subscription_number}
                          </Link>
                          <p className="truncate text-xs text-slate-500">
                            {item.customer_name} · {item.plan_name}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium text-navy">{formatDate(item.next_billing_date)}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(item.total_amount, item.currency)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Recent payments" description="Latest verified collections." />
              <CardBody className="p-0">
                {dashboard.recentPayments.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">No payments recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {dashboard.recentPayments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-navy">{payment.customer_name}</p>
                          <p className="text-xs text-slate-500">
                            {payment.payment_number} · {payment.invoice_number}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-navy">{formatCurrency(payment.amount, payment.currency)}</p>
                          <p className="text-xs text-slate-500">{formatDate(payment.payment_date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent subscriptions" description="Newest subscription records." />
              <CardBody className="p-0">
                {dashboard.recentSubscriptions.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">No subscriptions yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {dashboard.recentSubscriptions.map((subscription) => (
                      <li key={subscription.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <Link to={`/admin/subscriptions/${subscription.id}`} className="truncate text-sm font-medium text-navy hover:text-navy-600">
                            {subscription.subscription_number}
                          </Link>
                          <p className="truncate text-xs text-slate-500">
                            {subscription.customer_name} · {subscription.plan_name}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge status={subscription.status} />
                          <p className="mt-1 text-xs text-slate-500">
                            {formatCurrency(subscription.total_amount, subscription.currency)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="text-xs text-slate-400">
            Range {formatDate(range.from)} – {formatDate(range.to)}. Figures reflect live database records.
          </p>
        </div>
      )}
    </div>
  );
}