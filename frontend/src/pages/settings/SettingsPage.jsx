import { useEffect, useState } from 'react';
import { CalendarClock, Mail, Play, Save, Settings2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card, { CardBody } from '../../components/ui/Card.jsx';
import FormSection from '../../components/ui/FormSection.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import Badge from '../../components/ui/Badge.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import useList from '../../hooks/useList.js';
import { billingLogs, getSettings, runBilling, updateSettings } from '../../api/settings.api.js';
import { formatDateTime, titleCase, todayInputValue } from '../../utils/format.js';

const blank = {
  companyName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  gstNumber: '',
  currency: 'INR',
  invoicePrefix: 'INV',
  quotationPrefix: 'QUO',
  subscriptionPrefix: 'SUB',
  paymentPrefix: 'PAY',
  invoiceFooter: '',
};

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('company');
  const { data, loading, error, reload } = useAsync(() => getSettings(), []);
  const logs = useList(billingLogs, { sortBy: 'created_at' });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [runOpen, setRunOpen] = useState(false);
  const [runDate, setRunDate] = useState(todayInputValue());
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState(null);

  useEffect(() => {
    if (!data?.company) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      companyName: data.company.company_name ?? '',
      email: data.company.email ?? '',
      phone: data.company.phone ?? '',
      address: data.company.address ?? '',
      city: data.company.city ?? '',
      state: data.company.state ?? '',
      country: data.company.country ?? '',
      gstNumber: data.company.gst_number ?? '',
      currency: data.company.currency ?? 'INR',
      invoicePrefix: data.company.invoice_prefix ?? 'INV',
      quotationPrefix: data.company.quotation_prefix ?? 'QUO',
      subscriptionPrefix: data.company.subscription_prefix ?? 'SUB',
      paymentPrefix: data.company.payment_prefix ?? 'PAY',
      invoiceFooter: data.company.invoice_footer ?? '',
    });
  }, [data]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await updateSettings({
        ...form,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        gstNumber: form.gstNumber || null,
        invoiceFooter: form.invoiceFooter || null,
      });
      toast.success('Settings updated.');
      await reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const executeBilling = async (event) => {
    event.preventDefault();
    setRunning(true);
    setRunSummary(null);

    try {
      const summary = await runBilling({ date: runDate });
      setRunSummary(summary);
      toast.success(`Billing run completed: ${summary.generated?.length ?? 0} invoice(s) generated.`);
      await logs.reload();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading && !data) {
    return <Spinner label="Loading settings…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  const logColumns = [
    {
      key: 'created_at',
      header: 'When',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'subscription_number',
      header: 'Subscription',
      render: (row) => row.subscription_number || `#${row.subscription_id}`,
    },
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (row) => row.invoice_number || '—',
    },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'message', header: 'Message', render: (row) => row.message || '—' },
  ];

  const tabs = [
    { value: 'company', label: 'Company' },
    { value: 'billing', label: 'Billing' },
    { value: 'email', label: 'Email' },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company details, document numbering, billing automation, and email delivery."
        actions={
          tab === 'company' ? (
            <Button form="settings-form" type="submit" icon={Save} loading={saving}>Save changes</Button>
          ) : null
        }
      />

      <Card>
        <div className="px-5 pt-3">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>

        {tab === 'company' ? (
          <form id="settings-form" onSubmit={save}>
            <CardBody className="space-y-5">
              {formError ? <Alert tone="error">{formError}</Alert> : null}

              <FormSection title="Company profile" description="Shown on quotations, invoices, and receipts.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Company name" required value={form.companyName} onChange={(event) => setForm((c) => ({ ...c, companyName: event.target.value }))} />
                  <Input label="Billing email" type="email" required value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
                  <Input label="Phone" value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} />
                  <Input label="GSTIN" value={form.gstNumber} onChange={(event) => setForm((c) => ({ ...c, gstNumber: event.target.value }))} />
                  <Textarea label="Address" rows={2} value={form.address} onChange={(event) => setForm((c) => ({ ...c, address: event.target.value }))} containerClassName="sm:col-span-2" />
                  <Input label="City" value={form.city} onChange={(event) => setForm((c) => ({ ...c, city: event.target.value }))} />
                  <Input label="State" value={form.state} onChange={(event) => setForm((c) => ({ ...c, state: event.target.value }))} />
                  <Input label="Country" value={form.country} onChange={(event) => setForm((c) => ({ ...c, country: event.target.value }))} />
                  <Input label="Currency code" value={form.currency} onChange={(event) => setForm((c) => ({ ...c, currency: event.target.value.toUpperCase() }))} maxLength={3} hint="Three-letter ISO code, for example INR." />
                  <Textarea label="Invoice footer" rows={2} value={form.invoiceFooter} onChange={(event) => setForm((c) => ({ ...c, invoiceFooter: event.target.value }))} containerClassName="sm:col-span-2" />
                </div>
              </FormSection>

              <FormSection title="Document prefixes" description="Used when generating the next document number.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input label="Invoice" value={form.invoicePrefix} onChange={(event) => setForm((c) => ({ ...c, invoicePrefix: event.target.value.toUpperCase() }))} maxLength={12} />
                  <Input label="Quotation" value={form.quotationPrefix} onChange={(event) => setForm((c) => ({ ...c, quotationPrefix: event.target.value.toUpperCase() }))} maxLength={12} />
                  <Input label="Subscription" value={form.subscriptionPrefix} onChange={(event) => setForm((c) => ({ ...c, subscriptionPrefix: event.target.value.toUpperCase() }))} maxLength={12} />
                  <Input label="Payment" value={form.paymentPrefix} onChange={(event) => setForm((c) => ({ ...c, paymentPrefix: event.target.value.toUpperCase() }))} maxLength={12} />
                </div>
              </FormSection>

              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Settings2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Changes are audit logged and apply to future documents.
              </p>
            </CardBody>
          </form>
        ) : null}

        {tab === 'billing' ? (
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduler</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                  <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {data?.billing?.enabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Cron: {data?.billing?.cron || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Manual run</p>
                <p className="mt-1 text-sm text-slate-600">
                  Generate invoices for every subscription due on or before a date.
                </p>
                <Button size="sm" className="mt-3" icon={Play} onClick={() => setRunOpen(true)}>
                  Run billing now
                </Button>
              </div>
            </div>

            {runSummary ? (
              <Alert tone={runSummary.errors?.length ? 'warning' : 'success'}>
                <p className="font-semibold">Billing run for {runSummary.date}</p>
                <p className="mt-1 text-xs">
                  Scanned {runSummary.scanned} · Generated {runSummary.generated?.length ?? 0} · Skipped{' '}
                  {runSummary.skipped?.length ?? 0} · Errors {runSummary.errors?.length ?? 0}
                </p>
                {runSummary.generated?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                    {runSummary.generated.map((item) => (
                      <li key={item.subscriptionId ?? item.subscriptionNumber}>
                        {item.subscriptionNumber} → {item.invoiceNumber}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Alert>
            ) : null}

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Billing logs</h3>
                <span className="text-xs text-slate-500">{logs.meta?.total ?? 0} entries</span>
              </div>
              {logs.error ? (
                <ErrorState message={logs.error.message} onRetry={logs.reload} />
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <DataTable
                      columns={logColumns}
                      rows={logs.rows}
                      loading={logs.loading}
                      emptyTitle="No billing logs yet"
                      emptyDescription="Logs appear after the scheduler or a manual run processes subscriptions."
                    />
                  </div>
                  <div className="mt-3">
                    <Pagination
                      meta={logs.meta}
                      page={logs.page}
                      limit={logs.limit}
                      onPageChange={logs.setPage}
                      onLimitChange={logs.setLimit}
                    />
                  </div>
                </>
              )}
            </div>
          </CardBody>
        ) : null}

        {tab === 'email' ? (
          <CardBody className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Delivery mode: {titleCase(data?.mail?.mode || 'json')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                From: {data?.mail?.from || '—'}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                When SMTP is not configured, emails are written as JSON to the server log instead of being
                sent. Configure <code className="rounded bg-slate-100 px-1">SMTP_HOST</code> and related
                environment variables to deliver real email.
              </p>
            </div>
            <Alert tone="info">
              Quotation, invoice, and payment receipt emails include the generated PDF attachment.
            </Alert>
          </CardBody>
        ) : null}
      </Card>

      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Run billing"
        description="Processes every active subscription due on or before the selected date."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button form="billing-run-form" type="submit" icon={Play} loading={running}>
              Run billing
            </Button>
          </>
        }
      >
        <form id="billing-run-form" onSubmit={executeBilling} className="space-y-4">
          <Input
            label="Billing date"
            type="date"
            required
            value={runDate}
            onChange={(event) => setRunDate(event.target.value)}
            hint="Duplicate invoices for the same billing period are skipped automatically."
          />
        </form>
      </Modal>
    </div>
  );
}
