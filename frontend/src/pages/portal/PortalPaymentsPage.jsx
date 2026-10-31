import { Link } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useList from '../../hooks/useList.js';
import { downloadPortalReceipt, listPortalPayments } from '../../api/portal.api.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';

export default function PortalPaymentsPage() {
  const toast = useToast();
  const list = useList(listPortalPayments);

  const download = async (payment) => {
    try {
      await downloadPortalReceipt(payment);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'payment_number',
      header: 'Payment',
      render: (row) => (
        <div>
          <Link
            to={`/portal/payments/${row.id}`}
            className="font-medium text-slate-900 hover:text-brand-600"
          >
            {row.payment_number}
          </Link>
          <p className="text-xs text-slate-500">{row.transaction_reference || 'No reference'}</p>
        </div>
      ),
    },
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (row) => (
        <Link
          to={`/portal/invoices/${row.invoice_id}`}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {row.invoice_number}
        </Link>
      ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (row) => titleCase(row.payment_method),
    },
    { key: 'payment_date', header: 'Date', render: (row) => formatDate(row.payment_date) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-emerald-600">
          {formatCurrency(row.amount, row.currency)}
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
            aria-label={`Receipt for ${row.payment_number}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Link to={`/portal/payments/${row.id}`}>
            <Button variant="ghost" size="icon" aria-label={`View ${row.payment_number}`}>
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
        title="My payments"
        description="Payments recorded against your invoices, with downloadable receipts."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search payments or invoices…"
            className="w-full sm:w-96"
          />
          <span className="ml-auto text-xs text-slate-500">
            {list.meta?.total ?? 0} payments
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
              emptyTitle="No payments recorded"
              emptyDescription="Payments appear here once our billing team records them."
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
