import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CirclePause, CirclePlay, Download, XCircle } from 'lucide-react';
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
import DocumentLines from '../../components/documents/DocumentLines.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import {
  closePortalSubscription,
  getPortalSubscription,
  pausePortalSubscription,
  resumePortalSubscription,
} from '../../api/portal.api.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  titleCase,
} from '../../utils/format.js';

export default function PortalSubscriptionDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => getPortalSubscription(id), [id]);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
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

  const pause = async () => {
    const approved = await confirm({
      title: `Pause ${data.subscription_number}?`,
      message: 'Billing is paused until you resume the subscription. Access may stop during this period.',
      confirmLabel: 'Pause subscription',
    });

    if (approved) {
      await runAction('pause', () => pausePortalSubscription(data.id), 'Subscription paused.');
    }
  };

  const resume = async () => {
    await runAction('resume', () => resumePortalSubscription(data.id), 'Subscription resumed.');
  };

  const close = async (event) => {
    event.preventDefault();
    const result = await runAction(
      'close',
      () => closePortalSubscription(data.id, { reason: closeReason || null }),
      'Subscription closed.',
    );

    if (result) {
      setCloseOpen(false);
      setCloseReason('');
    }
  };

  const canPause = data.status === 'ACTIVE' && Boolean(data.allow_pause);
  const canResume = data.status === 'PAUSED';
  const canClose =
    Boolean(data.allow_early_closure) &&
    ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'].includes(data.status);

  const invoiceColumns = [
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (row) => (
        <Link
          to={`/portal/invoices/${row.id}`}
          className="font-medium text-slate-900 hover:text-brand-600"
        >
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
        <span
          className={
            Number(row.balance_due) > 0 ? 'font-medium text-rose-600' : 'text-slate-500'
          }
        >
          {formatCurrency(row.balance_due, data.currency)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={data.subscription_number}
        description={`${data.plan_name} · ${titleCase(data.billing_frequency)} billing`}
        breadcrumbs={[
          { label: 'Subscriptions', to: '/portal/subscriptions' },
          { label: data.subscription_number },
        ]}
        actions={
          <>
            {canPause ? (
              <Button
                variant="secondary"
                icon={CirclePause}
                loading={busy === 'pause'}
                onClick={pause}
              >
                Pause
              </Button>
            ) : null}
            {canResume ? (
              <Button
                icon={CirclePlay}
                loading={busy === 'resume'}
                onClick={resume}
              >
                Resume
              </Button>
            ) : null}
            {canClose ? (
              <Button
                variant="secondary"
                icon={XCircle}
                onClick={() => {
                  setActionError('');
                  setCloseOpen(true);
                }}
              >
                Request closure
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <Alert tone="error" className="mb-4">{actionError}</Alert> : null}

      {data.status === 'PAUSED' ? (
        <Alert tone="warning" className="mb-4">
          This subscription is paused. Billing resumes when you resume it.
        </Alert>
      ) : null}

      {data.close_reason ? (
        <Alert tone="warning" className="mb-4">
          Closed {formatDate(data.closed_at)} — {data.close_reason}
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Plan" actions={<Badge status={data.status} />} />
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: 'Plan', value: data.plan_name },
                { label: 'Billing frequency', value: titleCase(data.billing_frequency) },
                { label: 'Start date', value: formatDate(data.start_date) },
                { label: 'Expiry date', value: formatDate(data.expiry_date) },
                { label: 'Next billing', value: formatDate(data.next_billing_date) },
                { label: 'Payment terms', value: `${data.payment_terms_days} days` },
                {
                  label: 'Outstanding',
                  value: (
                    <span
                      className={
                        Number(data.outstanding_amount) > 0
                          ? 'font-semibold text-rose-600'
                          : 'text-slate-900'
                      }
                    >
                      {formatCurrency(data.outstanding_amount, data.currency)}
                    </span>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Account" />
          <CardBody>
            <DetailList
              columns={2}
              items={[
                { label: 'Name', value: data.customer_name },
                { label: 'Company', value: data.company_name || '—' },
                { label: 'Email', value: data.customer_email },
                { label: 'GSTIN', value: data.customer_gst_number || '—' },
                {
                  label: 'Billing address',
                  value:
                    [
                      data.customer_address,
                      data.customer_city,
                      data.customer_state,
                      data.customer_country,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—',
                  full: true,
                },
                { label: 'Prepared by', value: data.created_by_name || '—' },
                { label: 'Created', value: formatDateTime(data.created_at) },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="What you are billed for" />
        <CardBody className="p-0">
          <DocumentLines
            lines={data.lines ?? []}
            totals={data}
            currency={data.currency}
            showPlan
          />
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Invoices" description="Billing documents for this subscription." />
          <CardBody className="p-0">
            <DataTable
              columns={invoiceColumns}
              rows={data.invoices ?? []}
              emptyTitle="No invoices yet"
              emptyDescription="Invoices appear here as your subscription is billed."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="History" description="Lifecycle changes on this subscription." />
          <CardBody>
            {(data.history ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No history recorded.</p>
            ) : (
              <ol className="space-y-4">
                {data.history.map((entry) => (
                  <li key={entry.id} className="relative border-l border-slate-200 pl-4">
                    <span
                      className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-slate-900">{titleCase(entry.action)}</p>
                    <p className="text-xs text-slate-500">
                      {entry.from_status ? `${titleCase(entry.from_status)} → ` : ''}
                      {titleCase(entry.to_status)}
                    </p>
                    {entry.notes ? (
                      <p className="mt-1 text-xs text-slate-600">{entry.notes}</p>
                    ) : null}
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
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Request subscription closure"
        description="Closing stops future billing. This cannot be undone from the portal."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseOpen(false)}>
              Cancel
            </Button>
            <Button
              form="portal-close-form"
              type="submit"
              variant="danger"
              loading={busy === 'close'}
            >
              Close subscription
            </Button>
          </>
        }
      >
        <form id="portal-close-form" onSubmit={close} className="space-y-4">
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <Textarea
            label="Reason"
            rows={3}
            value={closeReason}
            onChange={(event) => setCloseReason(event.target.value)}
            placeholder="Tell us why you are closing this subscription…"
          />
        </form>
      </Modal>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Download className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Download any invoice to keep a copy for your records.
      </p>
    </div>
  );
}
