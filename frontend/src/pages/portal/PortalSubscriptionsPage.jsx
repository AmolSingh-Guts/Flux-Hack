import { Link } from 'react-router-dom';
import { Eye, Repeat } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { listPortalSubscriptions } from '../../api/portal.api.js';
import useAsync from '../../hooks/useAsync.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';

export default function PortalSubscriptionsPage() {
  const { data, loading, error, reload } = useAsync(() => listPortalSubscriptions(), []);
  const subscriptions = data ?? [];

  if (loading && !data) {
    return <Spinner label="Loading your subscriptions…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  const columns = [
    {
      key: 'subscription_number',
      header: 'Subscription',
      render: (row) => (
        <div>
          <Link
            to={`/portal/subscriptions/${row.id}`}
            className="font-medium text-slate-900 hover:text-brand-600"
          >
            {row.subscription_number}
          </Link>
          <p className="text-xs text-slate-500">{row.plan_name}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    {
      key: 'billing_frequency',
      header: 'Billing',
      render: (row) => titleCase(row.billing_frequency),
    },
    { key: 'start_date', header: 'Started', render: (row) => formatDate(row.start_date) },
    { key: 'expiry_date', header: 'Expires', render: (row) => formatDate(row.expiry_date) },
    {
      key: 'next_billing_date',
      header: 'Next billing',
      render: (row) => formatDate(row.next_billing_date),
    },
    {
      key: 'total_amount',
      header: 'Value',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(row.total_amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'outstanding_amount',
      header: 'Outstanding',
      align: 'right',
      render: (row) => (
        <span
          className={
            Number(row.outstanding_amount) > 0
              ? 'font-medium text-rose-600'
              : 'text-slate-500'
          }
        >
          {formatCurrency(row.outstanding_amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Link to={`/portal/subscriptions/${row.id}`}>
          <Button variant="ghost" size="icon" aria-label={`View ${row.subscription_number}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My subscriptions"
        description="Review your plans, billing schedule, and lifecycle status."
      />

      <Card>
        <DataTable
          columns={columns}
          rows={subscriptions}
          emptyTitle="No subscriptions yet"
          emptyDescription="When a subscription is created for your account it will appear here."
        />
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Repeat className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Open a subscription to pause, resume, or request closure where your plan allows it.
      </p>
    </div>
  );
}
