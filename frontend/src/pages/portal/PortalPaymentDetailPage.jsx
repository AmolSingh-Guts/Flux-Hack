import { Link, useParams } from 'react-router-dom';
import { Download, Receipt } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import { downloadPortalReceipt, getPortalPayment } from '../../api/portal.api.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  titleCase,
} from '../../utils/format.js';

export default function PortalPaymentDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => getPortalPayment(id), [id]);

  if (loading && !data) {
    return <Spinner label="Loading payment…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  const download = async () => {
    try {
      await downloadPortalReceipt(data);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const transactionColumns = [
    {
      key: 'transaction_reference',
      header: 'Reference',
      render: (row) => row.transaction_reference || '—',
    },
    { key: 'provider', header: 'Provider', render: (row) => titleCase(row.provider) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => formatCurrency(row.amount, data.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'VERIFIED' ? 'emerald' : 'slate'}>
          {titleCase(row.status)}
        </Badge>
      ),
    },
    {
      key: 'verified_at',
      header: 'Verified',
      render: (row) => (row.verified_at ? formatDateTime(row.verified_at) : '—'),
    },
    { key: 'created_at', header: 'Created', render: (row) => formatDateTime(row.created_at) },
  ];

  return (
    <div>
      <PageHeader
        title={data.payment_number}
        description={`Payment for invoice ${data.invoice_number}`}
        breadcrumbs={[
          { label: 'Payments', to: '/portal/payments' },
          { label: data.payment_number },
        ]}
        actions={
          <Button variant="secondary" icon={Download} onClick={download}>
            Download receipt
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader
            title="Payment"
            actions={
              <Badge tone={data.status === 'COMPLETED' ? 'emerald' : 'slate'}>
                {titleCase(data.status)}
              </Badge>
            }
          />
          <CardBody>
            <p className="text-3xl font-semibold tracking-tight text-emerald-600">
              {formatCurrency(data.amount, data.currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Received {formatDate(data.payment_date)}</p>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <DetailList
                columns={1}
                items={[
                  { label: 'Method', value: titleCase(data.payment_method) },
                  { label: 'Reference', value: data.transaction_reference || '—' },
                  { label: 'Recorded by', value: data.recorded_by_name || '—' },
                  { label: 'Created', value: formatDateTime(data.created_at) },
                  { label: 'Notes', value: data.notes || '—' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Invoice" />
          <CardBody>
            <DetailList
              columns={2}
              items={[
                {
                  label: 'Invoice',
                  value: (
                    <Link
                      to={`/portal/invoices/${data.invoice_id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {data.invoice_number}
                    </Link>
                  ),
                },
                { label: 'Invoice status', value: <Badge status={data.invoice_status} /> },
                { label: 'Invoice total', value: formatCurrency(data.invoice_total, data.currency) },
                {
                  label: 'Amount paid',
                  value: formatCurrency(data.invoice_amount_paid, data.currency),
                },
                {
                  label: 'Balance due',
                  value: (
                    <span
                      className={
                        Number(data.invoice_balance_due) > 0
                          ? 'font-semibold text-rose-600'
                          : 'font-semibold text-emerald-600'
                      }
                    >
                      {formatCurrency(data.invoice_balance_due, data.currency)}
                    </span>
                  ),
                },
                { label: 'Customer', value: data.customer_name },
                { label: 'Company', value: data.company_name || '—' },
                { label: 'Email', value: data.customer_email },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Transactions" description="Verification trail for this payment." />
        <CardBody className="p-0">
          <DataTable
            columns={transactionColumns}
            rows={data.transactions ?? []}
            emptyTitle="No transactions recorded"
          />
        </CardBody>
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Receipt className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Keep the receipt PDF for your accounting records.
      </p>
    </div>
  );
}
