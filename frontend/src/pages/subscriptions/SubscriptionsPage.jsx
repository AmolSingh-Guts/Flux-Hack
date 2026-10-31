import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import useList from '../../hooks/useList.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { listSubscriptions } from '../../api/subscriptions.api.js';
import { customerOptions } from '../../api/customers.api.js';
import { SUBSCRIPTION_STATUSES } from '../../utils/constants.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';

const editableStatuses = new Set(['DRAFT', 'QUOTATION']);

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const list = useList(listSubscriptions, { sortBy: 'created_at' });
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    customerOptions()
      .then((rows) => setCustomers(rows ?? []))
      .catch(() => setCustomers([]));
  }, []);

  const columns = [
    {
      key: 'subscription_number',
      header: 'Subscription',
      sortable: true,
      render: (row) => (
        <div>
          <Link to={`${base}/subscriptions/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {row.subscription_number}
          </Link>
          <p className="text-xs text-slate-500">{row.billing_frequency ? titleCase(row.billing_frequency) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-900">{row.customer_name}</p>
          <p className="text-xs text-slate-500">{row.company_name || row.customer_email}</p>
        </div>
      ),
    },
    { key: 'plan_name', header: 'Plan' },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge status={row.status} /> },
    { key: 'start_date', header: 'Start', sortable: true, render: (row) => formatDate(row.start_date) },
    { key: 'next_billing_date', header: 'Next billing', sortable: true, render: (row) => formatDate(row.next_billing_date) },
    {
      key: 'total_amount',
      header: 'Value',
      align: 'right',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.total_amount, row.currency)}</span>,
    },
    {
      key: 'outstanding_amount',
      header: 'Outstanding',
      align: 'right',
      render: (row) => (
        <span className={Number(row.outstanding_amount) > 0 ? 'font-medium text-rose-600' : 'text-slate-500'}>
          {formatCurrency(row.outstanding_amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/subscriptions/${row.id}`)} aria-label={`View ${row.subscription_number}`}>
            <Eye className="h-4 w-4" />
          </Button>
          {editableStatuses.has(row.status) ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/subscriptions/${row.id}/edit`)} aria-label={`Edit ${row.subscription_number}`}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Recurring agreements, billing schedules, and lifecycle state."
        actions={
          <Link to={`${base}/subscriptions/new`}>
            <Button icon={Plus}>New subscription</Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search subscription or customer…"
            className="w-full sm:w-80"
          />
          <Select
            value={list.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value)}
            placeholder="All statuses"
            options={SUBSCRIPTION_STATUSES.map((status) => ({ value: status, label: titleCase(status) }))}
            containerClassName="w-full sm:w-40"
          />
          <Select
            value={list.filters.customerId ?? ''}
            onChange={(event) => list.setFilter('customerId', event.target.value)}
            placeholder="All customers"
            options={customers.map((customer) => ({
              value: customer.id,
              label: customer.company_name ? `${customer.name} · ${customer.company_name}` : customer.name,
            }))}
            containerClassName="w-full sm:w-64"
          />
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} subscriptions</span>
        </div>

        {list.error ? (
          <div className="p-5">
            <ErrorState message={list.error.message} onRetry={list.reload} />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.rows}
              loading={list.loading}
              sortBy={list.sortBy}
              sortOrder={list.sortOrder}
              onSort={list.sort}
              emptyTitle="No subscriptions yet"
              emptyDescription="Create a subscription directly or convert an accepted quotation."
              emptyAction={
                <Link to={`${base}/subscriptions/new`}>
                  <Button size="sm" icon={Plus}>New subscription</Button>
                </Link>
              }
            />
            <div className="border-t border-slate-100 px-4 py-3">
              <Pagination
                meta={list.meta}
                page={list.page}
                limit={list.limit}
                onPageChange={list.setPage}
                onLimitChange={list.setLimit}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
