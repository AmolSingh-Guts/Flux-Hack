import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ban, Download, Mail, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import {
  downloadPaymentReceipt,
  getPayment,
  sendPaymentReceipt,
  voidPayment,
} from '../../api/payments.api.js';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/format.js';

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => getPayment(id), [id]);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  if (loading && !data) {
    return <Spinner label="Loading payment…" />;
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
      await downloadPaymentReceipt(data);
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const sendEmail = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'send',
      () => sendPaymentReceipt(data.id, { message: emailMessage || null }),
      'Receipt emailed.',
    );

    if (result) {
      setEmailOpen(false);
      setEmailMessage('');
    }
  };

  const voidRecord = async () => {
    const approved = await confirm({
      title: `Void ${data.payment_number}?`,
      message: 'The payment is removed from the invoice balance and marked as voided.',
      confirmLabel: 'Void payment',
    });

    if (!approved) {
      return;
    }

    const result = await runAction('void', () => voidPayment(data.id), 'Payment voided.');

    if (result) {
      navigate(`${base}/invoices/${data.invoice_id}`);
    }
  };

  const transactionColumns = [
    { key: 'transaction_reference', header: 'Reference', render: (row) => row.transaction_reference || '—' },
    { key: 'provider', header: 'Provider', render: (row) => titleCase(row.provider) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => formatCurrency(row.amount, data.currency),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'VERIFIED' ? 'emerald' : 'slate'}>{titleCase(row.status)}</Badge> },
    { key: 'verified_at', header: 'Verified', render: (row) => (row.verified_at ? formatDateTime(row.verified_at) : '—') },
    { key: 'created_at', header: 'Created', render: (row) => formatDateTime(row.created_at) },
  ];

  return (
    <div>
      <PageHeader
        title={data.payment_number}
        description={`${data.customer_name} · ${data.invoice_number}`}
        breadcrumbs={[
          { label: 'Payments', to: `${base}/payments` },
          { label: data.payment_number },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={download}>Receipt</Button>
            <Button variant="secondary" icon={Mail} onClick={() => setEmailOpen(true)}>Email receipt</Button>
            <Button variant="secondary" icon={Ban} onClick={voidRecord}>Void</Button>
          </>
        }
      />

      {actionError ? <Alert tone="error" className="mb-4">{actionError}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Payment" actions={<Badge tone={data.status === 'COMPLETED' ? 'emerald' : 'slate'}>{titleCase(data.status)}</Badge>} />
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
          <CardHeader title="Customer and invoice" />
          <CardBody>
            <DetailList
              columns={2}
              items={[
                { label: 'Customer', value: data.customer_name },
                { label: 'Company', value: data.company_name || '—' },
                { label: 'Email', value: data.customer_email },
                {
                  label: 'Address',
                  value:
                    [data.customer_address, data.customer_city, data.customer_state, data.customer_country]
                      .filter(Boolean)
                      .join(', ') || '—',
                },
                {
                  label: 'Invoice',
                  value: (
                    <Link to={`${base}/invoices/${data.invoice_id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {data.invoice_number}
                    </Link>
                  ),
                },
                { label: 'Invoice status', value: <Badge status={data.invoice_status} /> },
                { label: 'Invoice total', value: formatCurrency(data.invoice_total, data.currency) },
                { label: 'Invoice amount paid', value: formatCurrency(data.invoice_amount_paid, data.currency) },
                {
                  label: 'Invoice balance',
                  value: (
                    <span className={Number(data.invoice_balance_due) > 0 ? 'font-semibold text-rose-600' : 'text-emerald-600'}>
                      {formatCurrency(data.invoice_balance_due, data.currency)}
                    </span>
                  ),
                },
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

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Email receipt"
        description={`Send the receipt for ${data.payment_number} to ${data.customer_email}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button form="payment-email-form" type="submit" loading={busy === 'send'} icon={Mail}>
              Send receipt
            </Button>
          </>
        }
      >
        <form id="payment-email-form" onSubmit={sendEmail}>
          <Textarea
            label="Message"
            rows={4}
            value={emailMessage}
            onChange={(event) => setEmailMessage(event.target.value)}
            placeholder="Add an optional note to the customer…"
          />
        </form>
      </Modal>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Wallet className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Voiding a payment reverses the invoice balance automatically.
      </p>
    </div>
  );
}
