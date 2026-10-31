import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarPlus,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
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
  activateSubscription,
  closeSubscription,
  confirmSubscription,
  deleteSubscription,
  generateSubscriptionInvoice,
  getSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
} from '../../api/subscriptions.api.js';
import { addDaysInputValue, formatCurrency, formatDate, formatDateTime, titleCase, todayInputValue } from '../../utils/format.js';

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => getSubscription(id), [id]);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    billingPeriodStart: '',
    invoiceDate: todayInputValue(),
    dueDate: addDaysInputValue(30),
    notes: '',
  });
  const [closeReason, setCloseReason] = useState('');

  if (loading && !data) {
    return <Spinner label="Loading subscription…" />;
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

  const openInvoice = () => {
    setInvoiceForm({
      billingPeriodStart: data.next_billing_date ?? todayInputValue(),
      invoiceDate: todayInputValue(),
      dueDate: addDaysInputValue(Number(data.payment_terms_days ?? 30)),
      notes: '',
    });
    setActionError('');
    setInvoiceOpen(true);
  };

  const createInvoice = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'invoice',
      () =>
        generateSubscriptionInvoice(data.id, {
          billingPeriodStart: invoiceForm.billingPeriodStart || undefined,
          invoiceDate: invoiceForm.invoiceDate,
          dueDate: invoiceForm.dueDate,
          notes: invoiceForm.notes || null,
        }),
      'Invoice generated.',
    );

    if (result?.invoice?.id) {
      setInvoiceOpen(false);
      navigate(`${base}/invoices/${result.invoice.id}`);
    }
  };

  const close = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'close',
      () => closeSubscription(data.id, { reason: closeReason || null }),
      'Subscription closed.',
    );

    if (result) {
      setCloseOpen(false);
      setCloseReason('');
    }
  };

  const remove = async () => {
    const approved = await confirm({
      title: `Delete ${data.subscription_number}?`,
      message: 'Only draft or quotation subscriptions without invoices can be deleted.',
      confirmLabel: 'Delete subscription',
    });

    if (!approved) {
      return;
    }

    const result = await runAction('delete', () => deleteSubscription(data.id), 'Subscription deleted.');

    if (result) {
      navigate(`${base}/subscriptions`);
    }
  };

  const isEditable = ['DRAFT', 'QUOTATION'].includes(data.status);
  const canConfirm = ['DRAFT', 'QUOTATION'].includes(data.status);
  const canActivate = ['DRAFT', 'CONFIRMED'].includes(data.status);
  const canPause = data.status === 'ACTIVE' && Boolean(data.allow_pause);
  const canResume = data.status === 'PAUSED';
  const canRenew = ['ACTIVE', 'PAUSED', 'CLOSED'].includes(data.status) && Boolean(data.allow_renewal);
  const canClose = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'].includes(data.status);
  const canInvoice = data.status === 'ACTIVE';

  const invoiceColumns = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (row) => (
        <Link to={`${base}/invoices/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
          {row.invoice_number}
        </Link>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'invoice_date', header: 'Issued', render: (row) => formatDate(row.invoice_date) },
    { key: 'due_date', header: 'Due', render: (row) => formatDate(row.due_date) },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      render: (row) => formatCurrency(row.total_amount, data.currency),
    },
    {
      key: 'balance_due',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span className={Number(row.balance_due) > 0 ? 'font-medium text-rose-600' : 'text-slate-500'}>
          {formatCurrency(row.balance_due, data.currency)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={data.subscription_number}
        description={`${data.customer_name} · ${data.plan_name}`}
        breadcrumbs={[
          { label: 'Subscriptions', to: `${base}/subscriptions` },
          { label: data.subscription_number },
        ]}
        actions={
          <>
            {isEditable ? (
              <Link to={`${base}/subscriptions/${data.id}/edit`}>
                <Button variant="secondary" icon={Pencil}>Edit</Button>
              </Link>
            ) : null}
            {canConfirm ? (
              <Button
                variant="secondary"
                icon={CheckCircle2}
                loading={busy === 'confirm'}
                onClick={() => runAction('confirm', () => confirmSubscription(data.id), 'Subscription confirmed.')}
              >
                Confirm
              </Button>
            ) : null}
            {canActivate ? (
              <Button
                icon={ShieldCheck}
                loading={busy === 'activate'}
                onClick={() => runAction('activate', () => activateSubscription(data.id), 'Subscription activated.')}
              >
                Activate
              </Button>
            ) : null}
            {canPause ? (
              <Button
                variant="secondary"
                icon={CirclePause}
                loading={busy === 'pause'}
                onClick={() => runAction('pause', () => pauseSubscription(data.id), 'Subscription paused.')}
              >
                Pause
              </Button>
            ) : null}
            {canResume ? (
              <Button
                icon={CirclePlay}
                loading={busy === 'resume'}
                onClick={() => runAction('resume', () => resumeSubscription(data.id), 'Subscription resumed.')}
              >
                Resume
              </Button>
            ) : null}
            {canInvoice ? (
              <Button variant="secondary" icon={CalendarPlus} onClick={openInvoice}>Generate invoice</Button>
            ) : null}
            {canRenew ? (
              <Button
                variant="secondary"
                icon={RefreshCw}
                loading={busy === 'renew'}
                onClick={() => runAction('renew', () => renewSubscription(data.id), 'Subscription renewed.')}
              >
                Renew
              </Button>
            ) : null}
            {canClose ? (
              <Button variant="secondary" icon={XCircle} onClick={() => setCloseOpen(true)}>Close</Button>
            ) : null}
            {isEditable ? (
              <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete subscription">
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <Alert tone="error" className="mb-4">{actionError}</Alert> : null}

      {data.close_reason ? (
        <Alert tone="warning" className="mb-4">
          Closed {formatDate(data.closed_at)} — {data.close_reason}
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Customer" actions={<Badge status={data.status} />} />
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
          <CardHeader title="Subscription details" />
          <CardBody>
            <DetailList
              columns={2}
              items={[
                { label: 'Plan', value: data.plan_name },
                { label: 'Billing', value: titleCase(data.billing_frequency) },
                { label: 'Start date', value: formatDate(data.start_date) },
                { label: 'Expiry date', value: formatDate(data.expiry_date) },
                { label: 'Next billing', value: formatDate(data.next_billing_date) },
                { label: 'Payment terms', value: `${data.payment_terms_days} days` },
                { label: 'Prepared by', value: data.created_by_name || '—' },
                { label: 'Quotation', value: data.quotation_number || '—' },
                {
                  label: 'Outstanding',
                  value: (
                    <span className={Number(data.outstanding_amount) > 0 ? 'font-semibold text-rose-600' : 'text-slate-900'}>
                      {formatCurrency(data.outstanding_amount, data.currency)}
                    </span>
                  ),
                },
                { label: 'Created', value: formatDateTime(data.created_at) },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Line items" />
        <CardBody className="p-0">
          <DocumentLines lines={data.lines ?? []} totals={data} currency={data.currency} showPlan />
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Invoices"
            description="Invoices generated for this subscription."
            actions={
              canInvoice ? (
                <Button size="sm" icon={Plus} onClick={openInvoice}>Generate</Button>
              ) : null
            }
          />
          <CardBody className="p-0">
            <DataTable
              columns={invoiceColumns}
              rows={data.invoices ?? []}
              emptyTitle="No invoices yet"
              emptyDescription="Generate the first invoice when the subscription is active."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="History" description="Lifecycle changes and who made them." />
          <CardBody>
            {(data.history ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No history recorded.</p>
            ) : (
              <ol className="space-y-4">
                {data.history.map((entry) => (
                  <li key={entry.id} className="relative border-l border-slate-200 pl-4">
                    <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-slate-900">{titleCase(entry.action)}</p>
                    <p className="text-xs text-slate-500">
                      {entry.from_status ? `${titleCase(entry.from_status)} → ` : ''}
                      {titleCase(entry.to_status)}
                    </p>
                    {entry.notes ? <p className="mt-1 text-xs text-slate-600">{entry.notes}</p> : null}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDateTime(entry.created_at)}
                      {entry.performed_by_name ? ` · ${entry.performed_by_name}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        title="Generate invoice"
        description="Creates an invoice for the next billing period."
        footer={
          <>
            <Button variant="secondary" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button form="subscription-invoice-form" type="submit" loading={busy === 'invoice'} icon={CalendarPlus}>
              Generate invoice
            </Button>
          </>
        }
      >
        <form id="subscription-invoice-form" onSubmit={createInvoice} className="space-y-4">
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Billing period start"
              type="date"
              required
              value={invoiceForm.billingPeriodStart}
              onChange={(event) => setInvoiceForm((c) => ({ ...c, billingPeriodStart: event.target.value }))}
              hint="Duplicate periods are rejected automatically."
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Invoice date"
              type="date"
              required
              value={invoiceForm.invoiceDate}
              onChange={(event) => setInvoiceForm((c) => ({ ...c, invoiceDate: event.target.value }))}
            />
            <Input
              label="Due date"
              type="date"
              required
              value={invoiceForm.dueDate}
              onChange={(event) => setInvoiceForm((c) => ({ ...c, dueDate: event.target.value }))}
            />
            <Textarea
              label="Notes"
              rows={2}
              value={invoiceForm.notes}
              onChange={(event) => setInvoiceForm((c) => ({ ...c, notes: event.target.value }))}
              containerClassName="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Close subscription"
        description="Closing stops future billing for this subscription."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button form="subscription-close-form" type="submit" variant="danger" loading={busy === 'close'}>
              Close subscription
            </Button>
          </>
        }
      >
        <form id="subscription-close-form" onSubmit={close} className="space-y-4">
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <Textarea
            label="Reason"
            rows={3}
            value={closeReason}
            onChange={(event) => setCloseReason(event.target.value)}
            placeholder="Why is this subscription being closed?"
          />
        </form>
      </Modal>
    </div>
  );
}
