import { Link, useParams } from 'react-router-dom';
import { Download, Info } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DocumentLines from '../../components/documents/DocumentLines.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import { downloadPortalInvoicePdf, getPortalInvoice } from '../../api/portal.api.js';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/format.js';

export default function PortalInvoiceDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => getPortalInvoice(id), [id]);

  if (loading && !data) {
    return <Spinner label="Loading invoice…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  const download = async () => {
    try {
      await downloadPortalInvoicePdf(data);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const paymentColumns = [
    {
      key: 'payment_number',
      header: 'Payment',
      render: (row) => (
        <Link
          to={`/portal/payments/${row.id}`}
          className="font-medium text-slate-900 hover:text-brand-600"
        >
          {row.payment_number}
        </Link>
      ),
    },
    { key: 'payment_date', header: 'Date', render: (row) => formatDate(row.payment_date) },
    { key: 'payment_method', header: 'Method', render: (row) => titleCase(row.payment_method) },
    {
      key: 'transaction_reference',
      header: 'Reference',
      render: (row) => row.transaction_reference || '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-emerald-600">
          {formatCurrency(row.amount, data.currency)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={data.invoice_number}
        description={`Billed to ${data.company_name || data.customer_name}`}
        breadcrumbs={[
          { label: 'Invoices', to: '/portal/invoices' },
          { label: data.invoice_number },
        ]}
        actions={
          <Button variant="secondary" icon={Download} onClick={download}>
            Download PDF
          </Button>
        }
      />

      {data.status === 'OVERDUE' ? (
        <Alert tone="error" className="mb-4">
          This invoice is overdue. Balance due {formatCurrency(data.balance_due, data.currency)}.
          Please contact us if you have already paid.
        </Alert>
      ) : null}

      {data.status === 'CANCELLED' ? (
        <Alert tone="warning" className="mb-4">
          This invoice was cancelled {formatDate(data.cancelled_at)} and is no longer collectible.
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Bill to" actions={<Badge status={data.status} />} />
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: 'Name', value: data.customer_name },
                { label: 'Company', value: data.company_name || '—' },
                { label: 'Email', value: data.customer_email },
                {
                  label: 'Address',
                  value:
                    [
                      data.customer_address,
                      data.customer_city,
                      data.customer_state,
                      data.customer_country,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—',
                },
                { label: 'GSTIN', value: data.customer_gst_number || '—' },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Invoice details" />
          <CardBody>
            <DetailList
              columns={2}
              items={[
                { label: 'Invoice date', value: formatDate(data.invoice_date) },
                { label: 'Due date', value: formatDate(data.due_date) },
                {
                  label: 'Billing period',
                  value: data.billing_period_start
                    ? `${formatDate(data.billing_period_start)} – ${formatDate(data.billing_period_end)}`
                    : 'Manual invoice',
                },
                {
                  label: 'Subscription',
                  value: data.subscription_id ? (
                    <Link
                      to={`/portal/subscriptions/${data.subscription_id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {data.subscription_number}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Discount', value: data.discount_name || 'None applied' },
                { label: 'Payment terms', value: `${data.payment_terms_days} days` },
                {
                  label: 'Confirmed',
                  value: data.confirmed_at ? formatDateTime(data.confirmed_at) : '—',
                },
                { label: 'Currency', value: data.currency },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Line items" />
        <CardBody className="p-0">
          <DocumentLines lines={data.lines ?? []} totals={data} currency={data.currency} />
        </CardBody>
      </Card>

      {data.notes ? (
        <Card className="mt-6">
          <CardHeader title="Notes" />
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{data.notes}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader
          title="Payments"
          description="Payments recorded against this invoice by our billing team."
        />
        <CardBody className="p-0">
          <DataTable
            columns={paymentColumns}
            rows={data.payments ?? []}
            emptyTitle="No payments recorded"
            emptyDescription="Once a payment is recorded it will appear here."
          />
        </CardBody>
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Need help with this invoice? Contact Brightloop billing and quote the invoice number.
      </p>
    </div>
  );
}
