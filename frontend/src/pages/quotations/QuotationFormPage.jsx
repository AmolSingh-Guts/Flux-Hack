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
  createQuotation,
  getQuotation,
  quotationTemplates,
  updateQuotation,
} from '../../api/quotations.api.js';
import { customerOptions } from '../../api/customers.api.js';
import { productOptions } from '../../api/products.api.js';
import { planOptions } from '../../api/plans.api.js';
import { newLine, serializeLines } from '../../utils/lineItems.js';

export default function QuotationFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const editing = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    customerId: searchParams.get('customerId') ?? '',
    templateId: '',
    validityDays: 30,
    notes: '',
  });
  const [lines, setLines] = useState([newLine()]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [customerRows, templateRows, productRows, planRows] = await Promise.all([
          customerOptions(),
          quotationTemplates(),
          productOptions(),
          planOptions(),
        ]);

        if (!active) {
          return;
        }

        setCustomers(customerRows ?? []);
        setTemplates(templateRows ?? []);
        setProducts(productRows ?? []);
        setPlans(planRows ?? []);

        if (editing) {
          const quotation = await getQuotation(id);

          if (!active) {
            return;
          }

          setExisting(quotation);
          setForm({
            customerId: quotation.customer_id ?? '',
            templateId: quotation.template_id ?? '',
            validityDays: quotation.validity_days ?? 30,
            notes: quotation.notes ?? '',
          });
          setLines(
            (quotation.lines ?? []).map((line) => ({
              productId: line.product_id ?? '',
              variantId: line.variant_id ?? '',
              planId: line.plan_id ?? '',
              description: line.description ?? '',
              quantity: line.quantity ?? 1,
              unitPrice: line.unit_price ?? '',
              discountAmount: line.discount_amount ?? '',
            })),
          );
        } else {
          const defaultTemplate = (templateRows ?? []).find((template) => template.is_default);
          if (defaultTemplate) {
            setForm((current) => ({ ...current, templateId: defaultTemplate.id }));
          }
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
    return <Spinner label="Preparing quotation form…" />;
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
      customerId: Number(form.customerId),
      templateId: form.templateId ? Number(form.templateId) : null,
      validityDays: Number(form.validityDays || 30),
      notes: form.notes || null,
      lines: serializeLines(lines, products, plans),
    };

    try {
      if (editing) {
        await updateQuotation(id, payload);
        toast.success('Quotation updated.');
        navigate(`${base}/quotations/${id}`);
      } else {
        const quotation = await createQuotation(payload);
        toast.success('Quotation created.');
        navigate(`${base}/quotations/${quotation.id}`);
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
        title={editing ? `Edit ${existing?.quotation_number ?? 'quotation'}` : 'New quotation'}
        description="Pick a customer, add product lines, and send a professional proposal."
        breadcrumbs={[
          { label: 'Quotations', to: `${base}/quotations` },
          ...(editing ? [{ label: existing?.quotation_number ?? 'Edit', to: `${base}/quotations/${id}` }] : []),
          { label: editing ? 'Edit' : 'New' },
        ]}
        actions={
          <Link to={editing ? `${base}/quotations/${id}` : `${base}/quotations`}>
            <Button variant="secondary" icon={ArrowLeft}>Back</Button>
          </Link>
        }
      />

      {readOnly ? (
        <Alert tone="warning" className="mb-4">
          Only draft quotations can be edited. This quotation is {existing.status.toLowerCase()}.
        </Alert>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <FormSection title="Quotation details" description="Who the quotation is for and how long it stays valid.">
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
              label="Template"
              value={form.templateId}
              onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value }))}
              placeholder="Default template"
              options={templates.map((template) => ({ value: template.id, label: template.name }))}
              disabled={Boolean(readOnly)}
            />
            <Input
              label="Validity (days)"
              type="number"
              min="1"
              max="365"
              value={form.validityDays}
              onChange={(event) => setForm((current) => ({ ...current, validityDays: event.target.value }))}
              disabled={Boolean(readOnly)}
            />
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
            description="Select a product, optional variant and plan, then adjust quantity and pricing."
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
          <Link to={editing ? `${base}/quotations/${id}` : `${base}/quotations`}>
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button type="submit" icon={Save} loading={saving} disabled={Boolean(readOnly)}>
            {editing ? 'Save changes' : 'Create quotation'}
          </Button>
        </div>
      </form>
    </div>
  );
}
