import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import DetailList from '../../components/ui/DetailList.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import {
  createVariant,
  deleteVariant,
  getProduct,
  updateVariant,
} from '../../api/products.api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

const blankVariant = {
  name: '',
  brand: '',
  additionalPrice: '',
  isActive: true,
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => getProduct(id), [id]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blankVariant);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading && !data) {
    return <Spinner label="Loading product…" />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  const openCreate = () => {
    setForm(blankVariant);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (variant) => {
    setForm({
      name: variant.name ?? '',
      brand: variant.brand ?? '',
      additionalPrice: variant.additional_price ?? '',
      isActive: Boolean(variant.is_active),
    });
    setFormError('');
    setModal({ mode: 'edit', variant });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      brand: form.brand || null,
      additionalPrice: Number(form.additionalPrice || 0),
      isActive: form.isActive,
    };

    try {
      if (modal.mode === 'create') {
        await createVariant(data.id, payload);
        toast.success('Variant created.');
      } else {
        await updateVariant(modal.variant.id, payload);
        toast.success('Variant updated.');
      }
      setModal(null);
      await reload();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (variant) => {
    const approved = await confirm({
      title: `Delete ${variant.name}?`,
      message: 'Variants linked to existing records are deactivated instead of deleted.',
      confirmLabel: 'Delete variant',
    });

    if (!approved) {
      return;
    }

    try {
      const result = await deleteVariant(variant.id);
      toast.success(result?.message ?? 'Variant removed.');
      await reload();
    } catch (requestError) {
      toast.error(requestError.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Variant',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.brand || 'No brand'}</p>
        </div>
      ),
    },
    {
      key: 'additional_price',
      header: 'Additional price',
      align: 'right',
      render: (row) => formatCurrency(row.additional_price),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.is_active ? 'emerald' : 'slate'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    { key: 'created_at', header: 'Created', render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => remove(row)} aria-label={`Delete ${row.name}`}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      ),
    },
  ];

  const variants = data.variants ?? [];

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description || `${data.product_type} product`}
        breadcrumbs={[
          { label: 'Products', to: '/admin/products' },
          { label: data.name },
        ]}
        actions={
          <>
            <Link to="/admin/plans">
              <Button variant="secondary" icon={Layers}>View plans</Button>
            </Link>
            <Button icon={Plus} onClick={openCreate}>New variant</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Product details" actions={<Badge status={data.status} />} />
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: 'Type', value: data.product_type },
                { label: 'Sales price', value: formatCurrency(data.sales_price) },
                { label: 'Cost price', value: formatCurrency(data.cost_price) },
                {
                  label: 'Taxes',
                  value:
                    data.taxes?.length
                      ? data.taxes.map((tax) => `${tax.name} (${Number(tax.percentage).toFixed(2)}%)`).join(', ')
                      : 'No taxes',
                },
                { label: 'Internal notes', value: data.notes || '—' },
                { label: 'Created', value: formatDate(data.created_at) },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Variants"
            description="Variants add an optional price difference to the base product."
            actions={<Button size="sm" icon={Plus} onClick={openCreate}>Add variant</Button>}
          />
          <CardBody className="p-0">
            <DataTable
              columns={columns}
              rows={variants}
              emptyTitle="No variants yet"
              emptyDescription="Add editions, tiers, or add-ons for this product."
              emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>Add variant</Button>}
            />
          </CardBody>
        </Card>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'New variant' : 'Edit variant'}
        description="Variants are selectable on quotation, subscription, and invoice lines."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button form="variant-form" type="submit" loading={saving}>
              {modal?.mode === 'create' ? 'Create variant' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="variant-form" onSubmit={save} className="space-y-4">
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}
          <Input label="Variant name" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
          <Input label="Brand" value={form.brand} onChange={(event) => setForm((c) => ({ ...c, brand: event.target.value }))} />
          <Input label="Additional price" type="number" min="0" step="0.01" value={form.additionalPrice} onChange={(event) => setForm((c) => ({ ...c, additionalPrice: event.target.value }))} prefix="₹" hint="Added to the product sales price." />
          <Toggle label="Active" description="Inactive variants cannot be selected on new lines." checked={form.isActive} onChange={(value) => setForm((c) => ({ ...c, isActive: value }))} />
        </form>
      </Modal>
    </div>
  );
}
