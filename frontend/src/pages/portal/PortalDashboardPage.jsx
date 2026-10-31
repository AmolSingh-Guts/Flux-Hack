import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Receipt,
  Repeat,
  Wallet,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Alert from '../../components/ui/Alert.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { customerDashboard } from '../../api/dashboard.api.js';
import useAsync from '../../hooks/useAsync.js';
import { formatCurrency, formatDate, formatRelativeDate, titleCase } from '../../utils/format.js';

const empty = {
  cards: {},
  recentInvoices: [],
  recentPayments: [],
  subscriptions: [],
};

export default function PortalDashboardPage() {
  const { data, loading, error, reload } = useAsync(() => customerDashboard(), []);
  const dashboard = data ?? empty;
  const cards = dashboard.cards;

  if (loading && !data) {
    return <Spinner label="Loading your account…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  return (
    <div>
      <PageHeader
        title="My dashboard"
        description="Your subscriptions, invoices, and payments in one place."
        actions={
          <Link
            to="/portal/invoices"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View invoices <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="space-y-6">
        {Number(cards.outstandingAmount) > 0 ? (
          <Alert tone="warning" title="Outstanding balance">
            You have {formatCurrency(cards.outstandingAmount)} due across your invoices.
            {cards.overdueInvoices ? ` ${cards.overdueInvoices} invoice(s) are overdue.` : ''}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active subscriptions"
            value={cards.activeSubscriptions ?? 0}
            hint={`${cards.totalSubscriptions ?? 0} total · ${cards.pausedSubscriptions ?? 0} paused`}
            icon={Repeat}
            tone="brand"
          />
          <StatCard
            label="Outstanding balance"
            value={formatCurrency(cards.outstandingAmount)}
            hint={`${cards.overdueInvoices ?? 0} overdue invoice(s)`}
            icon={CircleDollarSign}
            tone={Number(cards.outstandingAmount) > 0 ? 'rose' : 'emerald'}
          />
          <StatCard
            label="Next billing"
            value={cards.nextBillingDate ? formatDate(cards.nextBillingDate) : '—'}
            hint={cards.nextBillingDate ? formatRelativeDate(cards.nextBillingDate) : 'No active billing scheduled'}
            icon={CalendarClock}
            tone="violet"
          />
          <StatCard
            label="Total paid"
            value={formatCurrency(cards.totalPaid)}
            hint={`${cards.paymentsCount ?? 0} payment(s) recorded`}
            icon={Wallet}
            tone="emerald"
          />
        </div>

        <Card>
          <CardHeader
            title="Your subscriptions"
            description="Active and historical agreements on your account."
            actions={
              <Link to="/portal/subscriptions" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                Manage
              </Link>
            }
          />
          <CardBody className="p-0">
            {dashboard.subscriptions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No subscriptions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {dashboard.subscriptions.map((subscription) => (
                  <li key={subscription.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <Link
                        to={`/portal/subscriptions/${subscription.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-brand-600"
                      >
                        {subscription.subscription_number}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {subscription.plan_name} · renews {formatDate(subscription.next_billing_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {formatCurrency(subscription.total_amount, subscription.currency)}
                        </p>
                        <p className="text-xs text-slate-500">{titleCase(subscription.status)}</p>
                      </div>
                      <Badge status={subscription.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Recent invoices"
              description="Your latest billing documents."
              actions={
                <Link to="/portal/invoices" className="text-xs font-medium text-brand-600 hover:text-brand-700">
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
                    <li key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <Link
                          to={`/portal/invoices/${invoice.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-brand-600"
                        >
                          {invoice.invoice_number}
                        </Link>
                        <p className="text-xs text-slate-500">Due {formatDate(invoice.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </p>
                        <div className="mt-1 flex justify-end">
                          <Badge status={invoice.status} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent payments"
              description="Payments recorded against your invoices."
              actions={
                <Link to="/portal/payments" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              }
            />
            <CardBody className="p-0">
              {dashboard.recentPayments.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dashboard.recentPayments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <Link
                          to={`/portal/payments/${payment.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-brand-600"
                        >
                          {payment.payment_number}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {payment.invoice_number} · {titleCase(payment.payment_method)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(payment.payment_date)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Receipt className="h-4 w-4" aria-hidden="true" />
          Figures reflect live records on your account. Contact support if something looks incorrect.
        </p>
      </div>
    </div>
  );
}
