import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Eye, Pencil, Plus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useList from '../../hooks/useList.js';
import { downloadInvoicePdf, listInvoices } from '../../api/invoices.api.js';
import { customerOptions } from '../../api/customers.api.js';
import { INVOICE_STATUSES } from '../../utils/constants.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const list = useList(listInvoices, { sortBy: 'created_at' });
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    customerOptions()
      .then((rows) => setCustomers(rows ?? []))
      .catch(() => setCustomers([]));
  }, []);

  const download = async (invoice) => {
    try {
      await downloadInvoicePdf(invoice);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      sortable: true,
      render: (row) => (
        <div>
          <Link to={`${base}/invoices/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {row.invoice_number}
          </Link>
          <p className="text-xs text-slate-500">{formatDate(row.invoice_date)}</p>
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
    {
      key: 'subscription_number',
      header: 'Subscription',
      render: (row) =>
        row.subscription_id ? (
          <Link to={`${base}/subscriptions/${row.subscription_id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            {row.subscription_number}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Manual</span>
        ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge status={row.status} /> },
    { key: 'due_date', header: 'Due', sortable: true, render: (row) => formatDate(row.due_date) },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.total_amount, row.currency)}</span>,
    },
    {
      key: 'balance_due',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span className={Number(row.balance_due) > 0 ? 'font-medium text-rose-600' : 'text-emerald-600'}>
          {formatCurrency(row.balance_due, row.currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => download(row)} aria-label={`Download ${row.invoice_number}`}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/invoices/${row.id}`)} aria-label={`View ${row.invoice_number}`}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'DRAFT' ? (
            <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/invoices/${row.id}/edit`)} aria-label={`Edit ${row.invoice_number}`}>
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
        title="Invoices"
        description="Manual and subscription invoices, payments, and outstanding balances."
        actions={
          <Link to={`${base}/invoices/new`}>
            <Button icon={Plus}>New invoice</Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search invoice or customer…"
            className="w-full sm:w-80"
          />
          <Select
            value={list.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value)}
            placeholder="All statuses"
            options={INVOICE_STATUSES.map((status) => ({ value: status, label: titleCase(status) }))}
            containerClassName="w-full sm:w-48"
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
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} invoices</span>
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
              emptyTitle="No invoices yet"
              emptyDescription="Create a manual invoice or generate one from an active subscription."
              emptyAction={
                <Link to={`${base}/invoices/new`}>
                  <Button size="sm" icon={Plus}>New invoice</Button>
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
