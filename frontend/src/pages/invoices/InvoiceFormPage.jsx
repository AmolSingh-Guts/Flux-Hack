import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import FormSection from '../../components/ui/FormSection.jsx';
import LineItemsEditor from '../../components/ui/LineItemsEditor.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  createInvoice,
  getInvoice,
  updateInvoice,
} from '../../api/invoices.api.js';
import { customerOptions } from '../../api/customers.api.js';
import { productOptions } from '../../api/products.api.js';
import { listSubscriptions } from '../../api/subscriptions.api.js';
import { addDaysInputValue, todayInputValue } from '../../utils/format.js';
import { newLine, serializeLines } from '../../utils/lineItems.js';

export default function InvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const editing = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    customerId: searchParams.get('customerId') ?? '',
    subscriptionId: searchParams.get('subscriptionId') ?? '',
    invoiceDate: todayInputValue(),
    dueDate: addDaysInputValue(30),
    paymentTermsDays: 30,
    status: 'DRAFT',
    applyDiscount: true,
    notes: '',
  });
  const [lines, setLines] = useState([newLine()]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [customerRows, productRows, subscriptionResult] = await Promise.all([
          customerOptions(),
          productOptions(),
          listSubscriptions({ limit: 100 }),
        ]);

        if (!active) {
          return;
        }

        setCustomers(customerRows ?? []);
        setProducts(productRows ?? []);
        setSubscriptions(subscriptionResult.rows ?? []);

        if (editing) {
          const invoice = await getInvoice(id);

          if (!active) {
            return;
          }

          setExisting(invoice);
          setForm({
            customerId: invoice.customer_id ?? '',
            subscriptionId: invoice.subscription_id ?? '',
            invoiceDate: invoice.invoice_date ?? todayInputValue(),
            dueDate: invoice.due_date ?? '',
            paymentTermsDays: invoice.payment_terms_days ?? 30,
            status: invoice.status,
            applyDiscount: Boolean(invoice.discount_id),
            notes: invoice.notes ?? '',
          });
          setLines(
            (invoice.lines ?? []).map((line) => ({
              productId: line.product_id ?? '',
              variantId: line.variant_id ?? '',
              planId: '',
              description: line.description ?? '',
              quantity: line.quantity ?? 1,
              unitPrice: line.unit_price ?? '',
              discountAmount: line.discount_amount ?? '',
            })),
          );
        }
      } catch (error) {
        if (active) {
          setLoadError(error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [editing, id]);

  if (loading) {
    return <Spinner label="Preparing invoice form…" />;
  }

  if (loadError) {
    return <ErrorState message={loadError.message} onRetry={() => navigate(0)} />;
  }

  const readOnly = existing && existing.status !== 'DRAFT';

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.customerId) {
      setFormError('Select a customer.');
      return;
    }

    if (lines.length === 0 || lines.some((line) => !line.productId || Number(line.quantity) <= 0)) {
      setFormError('Every line needs a product and a quantity greater than zero.');
      return;
    }

    setSaving(true);

    const payload = {
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      paymentTermsDays: Number(form.paymentTermsDays || 30),
      notes: form.notes || null,
      applyDiscount: form.applyDiscount,
      lines: serializeLines(lines, products),
    };

    try {
      if (editing) {
        await updateInvoice(id, payload);
        toast.success('Invoice updated.');
        navigate(`${base}/invoices/${id}`);
      } else {
        const invoice = await createInvoice({
          ...payload,
          customerId: Number(form.customerId),
          subscriptionId: form.subscriptionId ? Number(form.subscriptionId) : null,
          status: form.status,
        });
        toast.success('Invoice created.');
        navigate(`${base}/invoices/${invoice.id}`);
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={editing ? `Edit ${existing?.invoice_number ?? 'invoice'}` : 'New invoice'}
        description="Create a manual invoice with automatic tax and discount calculation."
        breadcrumbs={[
          { label: 'Invoices', to: `${base}/invoices` },
          ...(editing ? [{ label: existing?.invoice_number ?? 'Edit', to: `${base}/invoices/${id}` }] : []),
          { label: editing ? 'Edit' : 'New' },
        ]}
        actions={
          <Link to={editing ? `${base}/invoices/${id}` : `${base}/invoices`}>
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      {readOnly ? (
        <Alert tone="warning" className="mb-4">
          Only draft invoices can be edited. This invoice is {existing.status.toLowerCase()}.
        </Alert>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <FormSection title="Invoice details" description="Customer, dates, and whether to apply an eligible discount.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Customer"
              required
              value={form.customerId}
              onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
              placeholder="Select customer"
              options={customers.map((customer) => ({
                value: customer.id,
                label: customer.company_name ? `${customer.name} · ${customer.company_name}` : customer.name,
              }))}
              disabled={Boolean(readOnly)}
            />
            <Select
              label="Subscription"
              value={form.subscriptionId}
              onChange={(event) => setForm((current) => ({ ...current, subscriptionId: event.target.value }))}
              placeholder="No subscription (manual invoice)"
              options={subscriptions.map((subscription) => ({
                value: subscription.id,
                label: `${subscription.subscription_number} · ${subscription.customer_name}`,
              }))}
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Invoice date"
              type="date"
              required
              value={form.invoiceDate}
              onChange={(event) => setForm((current) => ({ ...current, invoiceDate: event.target.value }))}
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Due date"
              type="date"
              required
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Payment terms (days)"
              type="number"
              min="0"
              max="365"
              value={form.paymentTermsDays}
              onChange={(event) => setForm((current) => ({ ...current, paymentTermsDays: event.target.value }))}
              disabled={Boolean(readOnly)}
            />
            {!editing ? (
              <Select
                label="Initial status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                ]}
              />
            ) : null}
            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              disabled={Boolean(readOnly)}
              containerClassName="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Toggle
                label="Apply the best eligible discount"
                description="Uses the single best active discount for this invoice."
                checked={form.applyDiscount}
                onChange={(value) => setForm((current) => ({ ...current, applyDiscount: value }))}
                disabled={Boolean(readOnly)}
              />
            </div>
          </div>
        </FormSection>

        <Card>
          <CardHeader title="Line items" description="Tax is calculated from the product tax rules." />
          <CardBody>
            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              products={products}
              error={
                lines.some((line) => !line.productId)
                  ? 'Select a product for every line.'
                  : undefined
              }
              disabled={Boolean(readOnly)}
            />
          </CardBody>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Link to={editing ? `${base}/invoices/${id}` : `${base}/invoices`}>
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button type="submit" icon={Save} loading={saving} disabled={Boolean(readOnly)}>
            {editing ? 'Save changes' : 'Create invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
