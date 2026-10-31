import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Ban,
  CheckCircle2,
  Download,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Alert from '../../components/ui/Alert.jsx';
import DocumentLines from '../../components/documents/DocumentLines.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import {
  cancelInvoice,
  confirmInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  sendInvoice,
} from '../../api/invoices.api.js';
import { createPayment } from '../../api/payments.api.js';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { formatCurrency, formatDate, formatDateTime, titleCase, todayInputValue } from '../../utils/format.js';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => getInvoice(id), [id]);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'BANK_TRANSFER',
    amount: '',
    paymentDate: todayInputValue(),
    transactionReference: '',
    notes: '',
  });

  if (loading && !data) {
    return <Spinner label="Loading invoice…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setActionError('');

    try {
      const result = await action();
      toast.success(result?.message ?? successMessage);
      await reload();
      return result;
    } catch (requestError) {
      setActionError(requestError.message);
      return null;
    } finally {
      setBusy('');
    }
  };

  const download = async () => {
    try {
      await downloadInvoicePdf(data);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'send',
      () => sendInvoice(data.id, { message: emailMessage || null }),
      'Invoice emailed.',
    );

    if (result) {
      setEmailOpen(false);
      setEmailMessage('');
    }
  };

  const cancel = async () => {
    const approved = await confirm({
      title: `Cancel ${data.invoice_number}?`,
      message: 'Cancelling an invoice stops it from being collectible. This cannot be undone.',
      confirmLabel: 'Cancel invoice',
    });

    if (!approved) {
      return;
    }

    await runAction('cancel', () => cancelInvoice(data.id), 'Invoice cancelled.');
  };

  const remove = async () => {
    const approved = await confirm({
      title: `Delete ${data.invoice_number}?`,
      message: 'Only draft invoices can be deleted. This cannot be undone.',
      confirmLabel: 'Delete invoice',
    });

    if (!approved) {
      return;
    }

    const result = await runAction('delete', () => deleteInvoice(data.id), 'Invoice deleted.');

    if (result) {
      navigate(`${base}/invoices`);
    }
  };

  const openPayment = () => {
    setPaymentForm({
      paymentMethod: 'BANK_TRANSFER',
      amount: Number(data.balance_due).toFixed(2),
      paymentDate: todayInputValue(),
      transactionReference: '',
      notes: '',
    });
    setActionError('');
    setPaymentOpen(true);
  };

  const recordPayment = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'payment',
      () =>
        createPayment({
          invoiceId: data.id,
          paymentMethod: paymentForm.paymentMethod,
          amount: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          transactionReference: paymentForm.transactionReference || null,
          notes: paymentForm.notes || null,
        }),
      'Payment recorded.',
    );

    if (result) {
      setPaymentOpen(false);
    }
  };

  const canRecordPayment =
    !['DRAFT', 'CANCELLED', 'PAID'].includes(data.status) && Number(data.balance_due) > 0;

  const paymentColumns = [
    {
      key: 'payment_number',
      header: 'Payment',
      render: (row) => (
        <Link to={`${base}/payments/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
          {row.payment_number}
        </Link>
      ),
    },
    { key: 'payment_date', header: 'Date', render: (row) => formatDate(row.payment_date) },
    { key: 'payment_method', header: 'Method', render: (row) => titleCase(row.payment_method) },
    { key: 'transaction_reference', header: 'Reference', render: (row) => row.transaction_reference || '—' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="font-medium text-emerald-600">{formatCurrency(row.amount, data.currency)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={row.status === 'COMPLETED' ? 'emerald' : 'slate'}>{titleCase(row.status)}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={data.invoice_number}
        description={`${data.customer_name}${data.company_name ? ` · ${data.company_name}` : ''}`}
        breadcrumbs={[
          { label: 'Invoices', to: `${base}/invoices` },
          { label: data.invoice_number },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={download}>PDF</Button>
            {data.status !== 'CANCELLED' ? (
              <Button variant="secondary" icon={Mail} onClick={() => setEmailOpen(true)}>Email</Button>
            ) : null}
            {data.status === 'DRAFT' ? (
              <>
                <Link to={`${base}/invoices/${data.id}/edit`}>
                  <Button variant="secondary" icon={Pencil}>Edit</Button>
                </Link>
                <Button
                  icon={CheckCircle2}
                  loading={busy === 'confirm'}
                  onClick={() => runAction('confirm', () => confirmInvoice(data.id), 'Invoice confirmed.')}
                >
                  Confirm
                </Button>
                <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete invoice">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </>
            ) : null}
            {canRecordPayment ? (
              <Button icon={Plus} onClick={openPayment}>Record payment</Button>
            ) : null}
            {data.status !== 'CANCELLED' ? (
              <Button variant="secondary" icon={Ban} onClick={cancel}>Cancel</Button>
            ) : null}
          </>
        }
      />

      {actionError ? <Alert tone="error" className="mb-4">{actionError}</Alert> : null}
      {data.status === 'CANCELLED' ? (
        <Alert tone="warning" className="mb-4">
          This invoice was cancelled {formatDate(data.cancelled_at)} and is no longer collectible.
        </Alert>
      ) : null}
      {data.status === 'OVERDUE' ? (
        <Alert tone="error" className="mb-4">
          This invoice is overdue. Balance due {formatCurrency(data.balance_due, data.currency)}.
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
                    [data.customer_address, data.customer_city, data.customer_state, data.customer_country]
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
                  value:
                    data.billing_period_start
                      ? `${formatDate(data.billing_period_start)} – ${formatDate(data.billing_period_end)}`
                      : 'Manual invoice',
                },
                {
                  label: 'Subscription',
                  value: data.subscription_id ? (
                    <Link to={`${base}/subscriptions/${data.subscription_id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {data.subscription_number}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Discount', value: data.discount_name || 'None applied' },
                { label: 'Prepared by', value: data.created_by_name || '—' },
                { label: 'Confirmed', value: data.confirmed_at ? formatDateTime(data.confirmed_at) : 'Not confirmed' },
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
          description="Partial and full payments recorded against this invoice."
          actions={
            canRecordPayment ? (
              <Button size="sm" icon={Wallet} onClick={openPayment}>Record payment</Button>
            ) : null
          }
        />
        <CardBody className="p-0">
          <DataTable
            columns={paymentColumns}
            rows={data.payments ?? []}
            emptyTitle="No payments recorded"
            emptyDescription="Record a payment to reduce the balance due."
          />
        </CardBody>
      </Card>

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Email invoice"
        description={`Send ${data.invoice_number} to ${data.customer_email} with the PDF attached.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button form="invoice-email-form" type="submit" loading={busy === 'send'} icon={Mail}>
              Send email
            </Button>
          </>
        }
      >
        <form id="invoice-email-form" onSubmit={sendEmail}>
          <Textarea
            label="Message"
            rows={4}
            value={emailMessage}
            onChange={(event) => setEmailMessage(event.target.value)}
            placeholder="Add an optional note to the customer…"
          />
        </form>
      </Modal>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Record payment"
        description={`Balance due ${formatCurrency(data.balance_due, data.currency)}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button form="invoice-payment-form" type="submit" loading={busy === 'payment'} icon={Wallet}>
              Record payment
            </Button>
          </>
        }
      >
        <form id="invoice-payment-form" onSubmit={recordPayment} className="space-y-4">
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Payment method"
              value={paymentForm.paymentMethod}
              onChange={(event) => setPaymentForm((c) => ({ ...c, paymentMethod: event.target.value }))}
              options={PAYMENT_METHODS}
            />
            <Input
              label="Amount"
              type="number"
              min="0.01"
              max={Number(data.balance_due)}
              step="0.01"
              required
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((c) => ({ ...c, amount: event.target.value }))}
              prefix="₹"
            />
            <Input
              label="Payment date"
              type="date"
              required
              value={paymentForm.paymentDate}
              onChange={(event) => setPaymentForm((c) => ({ ...c, paymentDate: event.target.value }))}
            />
            <Input
              label="Transaction reference"
              value={paymentForm.transactionReference}
              onChange={(event) => setPaymentForm((c) => ({ ...c, transactionReference: event.target.value }))}
              placeholder="UPI / NEFT / receipt number"
            />
            <Textarea
              label="Notes"
              rows={2}
              value={paymentForm.notes}
              onChange={(event) => setPaymentForm((c) => ({ ...c, notes: event.target.value }))}
              containerClassName="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
