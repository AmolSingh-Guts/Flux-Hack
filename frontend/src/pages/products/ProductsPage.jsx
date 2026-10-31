import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Card from '../../components/ui/Card.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useList from '../../hooks/useList.js';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../../api/products.api.js';
import { activeTaxes } from '../../api/taxes.api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

const blank = {
  name: '',
  productType: 'Software',
  salesPrice: '',
  costPrice: '',
  description: '',
  notes: '',
  status: 'ACTIVE',
  taxRuleIds: [],
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const list = useList(listProducts, { sortBy: 'created_at' });
  const [taxes, setTaxes] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    activeTaxes()
      .then((rows) => setTaxes(rows ?? []))
      .catch(() => setTaxes([]));
  }, []);

  const openCreate = () => {
    setForm(blank);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (product) => {
    setForm({
      name: product.name ?? '',
      productType: product.product_type ?? 'Software',
      salesPrice: product.sales_price ?? '',
      costPrice: product.cost_price ?? '',
      description: product.description ?? '',
      notes: product.notes ?? '',
      status: product.status ?? 'ACTIVE',
      taxRuleIds: (product.taxes ?? []).map((tax) => tax.id),
    });
    setFormError('');
    setModal({ mode: 'edit', product });
  };

  const toggleTax = (id) => {
    setForm((current) => ({
      ...current,
      taxRuleIds: current.taxRuleIds.includes(id)
        ? current.taxRuleIds.filter((item) => item !== id)
        : [...current.taxRuleIds, id],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      productType: form.productType.trim(),
      salesPrice: Number(form.salesPrice || 0),
      costPrice: Number(form.costPrice || 0),
      description: form.description || null,
      notes: form.notes || null,
      status: form.status,
      taxRuleIds: form.taxRuleIds,
    };

    try {
      if (modal.mode === 'create') {
        await createProduct(payload);
        toast.success('Product created.');
      } else {
        await updateProduct(modal.product.id, payload);
        toast.success('Product updated.');
      }
      setModal(null);
      await list.reload();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    const approved = await confirm({
      title: `Delete ${product.name}?`,
      message:
        'Products used by plans or subscriptions are archived instead of permanently deleted.',
      confirmLabel: 'Delete product',
    });

    if (!approved) {
      return;
    }

    try {
      const result = await deleteProduct(product.id);
      toast.success(result?.message ?? 'Product removed.');
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div>
          <Link to={`/admin/products/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {row.name}
          </Link>
          <p className="text-xs text-slate-500">{row.product_type}</p>
        </div>
      ),
    },
    {
      key: 'sales_price',
      header: 'Sales price',
      align: 'right',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.sales_price)}</span>,
    },
    {
      key: 'cost_price',
      header: 'Cost',
      align: 'right',
      render: (row) => formatCurrency(row.cost_price),
    },
    {
      key: 'variant_count',
      header: 'Variants',
      align: 'right',
      render: (row) => row.variant_count ?? 0,
    },
    {
      key: 'plan_count',
      header: 'Plans',
      align: 'right',
      render: (row) => row.plan_count ?? 0,
    },
    {
      key: 'taxes',
      header: 'Taxes',
      render: (row) =>
        row.taxes?.length ? (
          <div className="flex flex-wrap gap-1">
            {row.taxes.map((tax) => (
              <Badge key={tax.id} tone="brand" dot={false}>
                {tax.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">None</span>
        ),
    },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'created_at', header: 'Created', sortable: true, render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/products/${row.id}`)} aria-label={`View ${row.name}`}>
            <Eye className="h-4 w-4" />
          </Button>
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

  return (
    <div>
      <PageHeader
        title="Products"
        description="The software and services you sell, their pricing, taxes, and variants."
        actions={<Button icon={Plus} onClick={openCreate}>New product</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search products…"
            className="w-full sm:w-80"
          />
          <Select
            value={list.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value)}
            placeholder="All statuses"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            containerClassName="w-full sm:w-40"
          />
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} products</span>
        </div>

        {list.error ? (
          <div className="p-5">
            <ErrorState message={list.error.message} onRetry={list.reload} />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.rows}
              loading={list.loading}
              sortBy={list.sortBy}
              sortOrder={list.sortOrder}
              onSort={list.sort}
              emptyTitle="No products yet"
              emptyDescription="Add a product to start building plans and subscriptions."
              emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>New product</Button>}
            />
            <div className="border-t border-slate-100 px-4 py-3">
              <Pagination
                meta={list.meta}
                page={list.page}
                limit={list.limit}
                onPageChange={list.setPage}
                onLimitChange={list.setLimit}
              />
            </div>
          </>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'New product' : 'Edit product'}
        description="Products define the base price. Variants and plans extend a product."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button form="product-form" type="submit" loading={saving}>
              {modal?.mode === 'create' ? 'Create product' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={save} className="space-y-4">
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Product name" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            <Input label="Product type" required value={form.productType} onChange={(event) => setForm((c) => ({ ...c, productType: event.target.value }))} hint="For example Software, Support, or Training." />
            <Input label="Sales price" type="number" min="0" step="0.01" required value={form.salesPrice} onChange={(event) => setForm((c) => ({ ...c, salesPrice: event.target.value }))} prefix="₹" />
            <Input label="Cost price" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm((c) => ({ ...c, costPrice: event.target.value }))} prefix="₹" />
            <Textarea label="Description" rows={3} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} containerClassName="sm:col-span-2" />
            <Textarea label="Internal notes" rows={2} value={form.notes} onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))} containerClassName="sm:col-span-2" />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm((c) => ({ ...c, status: event.target.value }))}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Applicable taxes</p>
            {taxes.length === 0 ? (
              <p className="text-xs text-slate-500">No active tax rules. Add taxes first to apply them.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {taxes.map((tax) => (
                  <div key={tax.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                    <Checkbox
                      label={`${tax.name} (${Number(tax.percentage).toFixed(2)}%)`}
                      description={tax.tax_type}
                      checked={form.taxRuleIds.includes(tax.id)}
                      onChange={() => toggleTax(tax.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Boxes className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Open a product to manage its variants and see linked plans.
      </div>
    </div>
  );
}
