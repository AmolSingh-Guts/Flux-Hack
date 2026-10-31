import { Link } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useList from '../../hooks/useList.js';
import { downloadPortalInvoicePdf, listPortalInvoices } from '../../api/portal.api.js';
import { INVOICE_STATUSES } from '../../utils/constants.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';

export default function PortalInvoicesPage() {
  const toast = useToast();
  const list = useList(listPortalInvoices);

  const download = async (invoice) => {
    try {
      await downloadPortalInvoicePdf(invoice);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (row) => (
        <div>
          <Link
            to={`/portal/invoices/${row.id}`}
            className="font-medium text-slate-900 hover:text-brand-600"
          >
            {row.invoice_number}
          </Link>
          <p className="text-xs text-slate-500">{formatDate(row.invoice_date)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'due_date', header: 'Due', render: (row) => formatDate(row.due_date) },
    {
      key: 'billing_period',
      header: 'Billing period',
      render: (row) =>
        row.billing_period_start
          ? `${formatDate(row.billing_period_start)} – ${formatDate(row.billing_period_end)}`
          : 'Manual invoice',
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(row.total_amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'balance_due',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span
          className={
            Number(row.balance_due) > 0
              ? 'font-medium text-rose-600'
              : 'font-medium text-emerald-600'
          }
        >
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => download(row)}
            aria-label={`Download ${row.invoice_number}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Link to={`/portal/invoices/${row.id}`}>
            <Button variant="ghost" size="icon" aria-label={`View ${row.invoice_number}`}>
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My invoices"
        description="Every invoice issued on your account, with live payment status."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search invoices…"
            className="w-full sm:w-80"
          />
          <Select
            value={list.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value)}
            placeholder="All statuses"
            options={INVOICE_STATUSES.map((status) => ({
              value: status,
              label: titleCase(status),
            }))}
            containerClassName="w-full sm:w-48"
          />
          <span className="ml-auto text-xs text-slate-500">
            {list.meta?.total ?? 0} invoices
          </span>
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
              emptyTitle="No invoices found"
              emptyDescription="Invoices appear here once your subscription is billed."
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
