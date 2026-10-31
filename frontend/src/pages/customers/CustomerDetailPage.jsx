import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Repeat,
  Wallet,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import CustomerFormFields, {
  customerToForm,
  formToCustomer,
} from '../../components/customers/CustomerFormFields.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getCustomer, updateCustomer } from '../../api/customers.api.js';
import { formatCurrency, formatDate, titleCase } from '../../utils/format.js';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => getCustomer(id), [id]);
  const [tab, setTab] = useState('subscriptions');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading && !data) {
    return <Spinner label="Loading customer…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  const { customer, subscriptions, invoices, payments, quotations } = data;
  const outstanding = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.balance_due ?? 0),
    0,
  );
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  const openEdit = () => {
    setForm(customerToForm(customer));
    setFormError('');
    setEditing(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      await updateCustomer(customer.id, formToCustomer(form));
      toast.success('Customer updated.');
      setEditing(false);
      await reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const subscriptionColumns = [
    {
      key: 'subscription_number',
      header: 'Subscription',
      render: (row) => (
        <Link to={`${base}/subscriptions/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
          {row.subscription_number}
        </Link>
      ),
    },
    { key: 'plan_name', header: 'Plan' },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'start_date', header: 'Start', render: (row) => formatDate(row.start_date) },
    { key: 'next_billing_date', header: 'Next billing', render: (row) => formatDate(row.next_billing_date) },
    {
      key: 'total_amount',
      header: 'Value',
      align: 'right',
      render: (row) => formatCurrency(row.total_amount, row.currency),
    },
  ];

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
      render: (row) => formatCurrency(row.total_amount, row.currency),
    },
    {
      key: 'balance_due',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span className={Number(row.balance_due) > 0 ? 'font-medium text-rose-600' : 'text-slate-500'}>
          {formatCurrency(row.balance_due, row.currency)}
        </span>
      ),
    },
  ];

  const paymentColumns = [
    { key: 'payment_number', header: 'Payment' },
    { key: 'invoice_number', header: 'Invoice' },
    { key: 'payment_date', header: 'Date', render: (row) => formatDate(row.payment_date) },
    { key: 'payment_method', header: 'Method', render: (row) => titleCase(row.payment_method) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="font-medium text-emerald-600">{formatCurrency(row.amount)}</span>,
    },
  ];

  const quotationColumns = [
    {
      key: 'quotation_number',
      header: 'Quotation',
      render: (row) => (
        <Link to={`${base}/quotations/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
          {row.quotation_number}
        </Link>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'valid_until', header: 'Valid until', render: (row) => formatDate(row.valid_until) },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      render: (row) => formatCurrency(row.total_amount, row.currency),
    },
  ];

  const tabs = [
    { value: 'subscriptions', label: 'Subscriptions', count: subscriptions.length },
    { value: 'invoices', label: 'Invoices', count: invoices.length },
    { value: 'payments', label: 'Payments', count: payments.length },
    { value: 'quotations', label: 'Quotations', count: quotations.length },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.company_name || customer.email}
        breadcrumbs={[
          { label: 'Customers', to: `${base}/customers` },
          { label: customer.name },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={openEdit}>
              Edit
            </Button>
            <Link to={`${base}/quotations/new?customerId=${customer.id}`}>
              <Button variant="secondary" icon={FileText}>
                Quotation
              </Button>
            </Link>
            <Link to={`${base}/subscriptions/new?customerId=${customer.id}`}>
              <Button icon={Plus}>Subscription</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subscriptions"
          value={customer.subscription_count ?? subscriptions.length}
          hint={`${subscriptions.filter((item) => item.status === 'ACTIVE').length} active`}
          icon={Repeat}
          tone="brand"
        />
        <StatCard
          label="Invoices"
          value={customer.invoice_count ?? invoices.length}
          hint={`${invoices.filter((item) => item.status === 'OVERDUE').length} overdue`}
          icon={Receipt}
          tone="amber"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          hint="Across open invoices"
          icon={Wallet}
          tone="rose"
        />
        <StatCard
          label="Collected"
          value={formatCurrency(paid)}
          hint={`${payments.length} completed payments`}
          icon={Wallet}
          tone="emerald"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Customer details" actions={<Badge status={customer.status} />} />
          <CardBody className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-slate-900">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-slate-900">{customer.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500">Company</p>
                <p className="text-slate-900">{customer.company_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-slate-900">
                  {[customer.address, customer.city, customer.state, customer.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500">
              <p>Registered {formatDate(customer.registration_date)}</p>
              <p className="mt-1">GSTIN {customer.gst_number || '—'}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <div className="px-5 pt-4">
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
          </div>
          <CardBody className="p-0">
            {tab === 'subscriptions' ? (
              <DataTable columns={subscriptionColumns} rows={subscriptions} emptyTitle="No subscriptions for this customer" />
            ) : null}
            {tab === 'invoices' ? (
              <DataTable columns={invoiceColumns} rows={invoices} emptyTitle="No invoices for this customer" />
            ) : null}
            {tab === 'payments' ? (
              <DataTable columns={paymentColumns} rows={payments} emptyTitle="No payments for this customer" />
            ) : null}
            {tab === 'quotations' ? (
              <DataTable columns={quotationColumns} rows={quotations} emptyTitle="No quotations for this customer" />
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit customer"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button form="customer-detail-form" type="submit" loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        {form ? (
          <form id="customer-detail-form" onSubmit={save} className="space-y-4">
            {formError ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
            ) : null}
            <CustomerFormFields value={form} onChange={setForm} />
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
