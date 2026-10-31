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
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  createSubscription,
  getSubscription,
  updateSubscription,
} from '../../api/subscriptions.api.js';
import { customerOptions } from '../../api/customers.api.js';
import { productOptions } from '../../api/products.api.js';
import { planOptions } from '../../api/plans.api.js';
import { addDaysInputValue, todayInputValue } from '../../utils/format.js';
import { newLine, serializeLines } from '../../utils/lineItems.js';

const editableStatuses = new Set(['DRAFT', 'QUOTATION']);

export default function SubscriptionFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const editing = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    customerId: searchParams.get('customerId') ?? '',
    planId: '',
    startDate: todayInputValue(),
    expiryDate: addDaysInputValue(365),
    nextBillingDate: '',
    paymentTermsDays: 30,
    status: 'DRAFT',
    notes: '',
  });
  const [lines, setLines] = useState([newLine()]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [customerRows, productRows, planRows] = await Promise.all([
          customerOptions(),
          productOptions(),
          planOptions(),
        ]);

        if (!active) {
          return;
        }

        setCustomers(customerRows ?? []);
        setProducts(productRows ?? []);
        setPlans(planRows ?? []);

        if (editing) {
          const subscription = await getSubscription(id);

          if (!active) {
            return;
          }

          setExisting(subscription);
          setForm({
            customerId: subscription.customer_id ?? '',
            planId: subscription.plan_id ?? '',
            startDate: subscription.start_date ?? todayInputValue(),
            expiryDate: subscription.expiry_date ?? '',
            nextBillingDate: subscription.next_billing_date ?? '',
            paymentTermsDays: subscription.payment_terms_days ?? 30,
            status: subscription.status,
            notes: subscription.notes ?? '',
          });
          setLines(
            (subscription.lines ?? []).map((line) => ({
              productId: line.product_id ?? '',
              variantId: line.variant_id ?? '',
              planId: line.plan_id ?? '',
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
    return <Spinner label="Preparing subscription form…" />;
  }

  if (loadError) {
    return <ErrorState message={loadError.message} onRetry={() => navigate(0)} />;
  }

  const readOnly = existing && !editableStatuses.has(existing.status);

  const onPlanChange = (planId) => {
    const plan = plans.find((item) => String(item.id) === String(planId));

    setForm((current) => ({ ...current, planId }));

    if (!plan) {
      return;
    }

    setLines((current) =>
      current.map((line) => {
        if (!line.productId) {
          return { ...line, productId: plan.product_id, planId, unitPrice: '' };
        }

        if (String(line.productId) === String(plan.product_id)) {
          return { ...line, planId, unitPrice: '' };
        }

        return line;
      }),
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.customerId) {
      setFormError('Select a customer.');
      return;
    }

    if (!form.planId) {
      setFormError('Select a plan.');
      return;
    }

    if (lines.length === 0 || lines.some((line) => !line.productId || Number(line.quantity) <= 0)) {
      setFormError('Every line needs a product and a quantity greater than zero.');
      return;
    }

    setSaving(true);

    const payload = {
      customerId: Number(form.customerId),
      planId: Number(form.planId),
      startDate: form.startDate,
      ...(form.expiryDate ? { expiryDate: form.expiryDate } : {}),
      ...(form.nextBillingDate ? { nextBillingDate: form.nextBillingDate } : {}),
      paymentTermsDays: Number(form.paymentTermsDays || 30),
      ...(editing ? {} : { status: form.status }),
      notes: form.notes || null,
      lines: serializeLines(lines, products, plans, { planId: form.planId }),
    };

    try {
      if (editing) {
        await updateSubscription(id, payload);
        toast.success('Subscription updated.');
        navigate(`${base}/subscriptions/${id}`);
      } else {
        const subscription = await createSubscription(payload);
        toast.success('Subscription created.');
        navigate(`${base}/subscriptions/${subscription.id}`);
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
        title={editing ? `Edit ${existing?.subscription_number ?? 'subscription'}` : 'New subscription'}
        description="Set the customer, plan, billing dates, and line items."
        breadcrumbs={[
          { label: 'Subscriptions', to: `${base}/subscriptions` },
          ...(editing ? [{ label: existing?.subscription_number ?? 'Edit', to: `${base}/subscriptions/${id}` }] : []),
          { label: editing ? 'Edit' : 'New' },
        ]}
        actions={
          <Link to={editing ? `${base}/subscriptions/${id}` : `${base}/subscriptions`}>
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      {readOnly ? (
        <Alert tone="warning" className="mb-4">
          Only draft or quotation subscriptions can be edited. This subscription is {existing.status.toLowerCase()}.
        </Alert>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <FormSection title="Subscription details" description="Core billing schedule for this agreement.">
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
              label="Plan"
              required
              value={form.planId}
              onChange={(event) => onPlanChange(event.target.value)}
              placeholder="Select plan"
              options={plans.map((plan) => ({
                value: plan.id,
                label: `${plan.name} · ${plan.billing_frequency}`,
              }))}
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Start date"
              type="date"
              required
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Expiry date"
              type="date"
              value={form.expiryDate}
              onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
              hint="Defaults to one billing period from the start date."
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Next billing date"
              type="date"
              value={form.nextBillingDate}
              onChange={(event) => setForm((current) => ({ ...current, nextBillingDate: event.target.value }))}
              hint="Defaults to the start date."
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
                  { value: 'ACTIVE', label: 'Active' },
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
          </div>
        </FormSection>

        <Card>
          <CardHeader
            title="Line items"
            description="Selecting a plan sets the plan price on matching product lines."
          />
          <CardBody>
            <LineItemsEditor
              lines={lines}
              onChange={setLines}
              products={products}
              plans={plans}
              showPlans
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
          <Link to={editing ? `${base}/subscriptions/${id}` : `${base}/subscriptions`}>
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button type="submit" icon={Save} loading={saving} disabled={Boolean(readOnly)}>
            {editing ? 'Save changes' : 'Create subscription'}
          </Button>
        </div>
      </form>
    </div>
  );
}
