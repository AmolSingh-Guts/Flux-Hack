import { useEffect, useState } from 'react';
import { BadgePercent, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Card from '../../components/ui/Card.jsx';
import Modal from '../../components/ui/Modal.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useList from '../../hooks/useList.js';
import {
  createDiscount,
  deleteDiscount,
  listDiscounts,
  updateDiscount,
} from '../../api/discounts.api.js';
import { productOptions } from '../../api/products.api.js';
import { listSubscriptions } from '../../api/subscriptions.api.js';
import { formatCurrency, formatDate, titleCase, todayInputValue } from '../../utils/format.js';

function blankDiscount() {
  return {
    name: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minimumPurchase: 0,
    minimumQuantity: 1,
    startDate: todayInputValue(),
    endDate: '',
    maximumUsage: '',
    scope: 'ALL',
    isActive: true,
    productIds: [],
    subscriptionIds: [],
  };
}

export default function DiscountsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useList(listDiscounts, { sortBy: 'created_at' });
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blankDiscount);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    productOptions()
      .then((rows) => setProducts(rows ?? []))
      .catch(() => setProducts([]));
    listSubscriptions({ limit: 100 })
      .then((result) => setSubscriptions(result.rows ?? []))
      .catch(() => setSubscriptions([]));
  }, []);

  const openCreate = () => {
    setForm(blankDiscount());
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (discount) => {
    setForm({
      name: discount.name ?? '',
      discountType: discount.discount_type ?? 'PERCENTAGE',
      discountValue: discount.discount_value ?? '',
      minimumPurchase: discount.minimum_purchase ?? 0,
      minimumQuantity: discount.minimum_quantity ?? 1,
      startDate: discount.start_date ?? todayInputValue(),
      endDate: discount.end_date ?? '',
      maximumUsage: discount.maximum_usage ?? '',
      scope: discount.scope ?? 'ALL',
      isActive: Boolean(discount.is_active),
      productIds: discount.product_ids ?? [],
      subscriptionIds: discount.subscription_ids ?? [],
    });
    setFormError('');
    setModal({ mode: 'edit', discount });
  };

  const toggleId = (field, id) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((item) => item !== id)
        : [...current[field], id],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      minimumPurchase: Number(form.minimumPurchase || 0),
      minimumQuantity: Number(form.minimumQuantity || 1),
      startDate: form.startDate,
      endDate: form.endDate,
      maximumUsage: form.maximumUsage ? Number(form.maximumUsage) : null,
      scope: form.scope,
      isActive: form.isActive,
      productIds: form.scope === 'PRODUCTS' ? form.productIds : [],
      subscriptionIds: form.scope === 'SUBSCRIPTIONS' ? form.subscriptionIds : [],
    };

    try {
      if (modal.mode === 'create') {
        await createDiscount(payload);
        toast.success('Discount created.');
      } else {
        await updateDiscount(modal.discount.id, payload);
        toast.success('Discount updated.');
      }
      setModal(null);
      await list.reload();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (discount) => {
    try {
      await updateDiscount(discount.id, { isActive: !discount.is_active });
      toast.success(`Discount ${discount.is_active ? 'deactivated' : 'activated'}.`);
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async (discount) => {
    const approved = await confirm({
      title: `Delete ${discount.name}?`,
      message: 'Discounts already applied to invoices are kept for audit history.',
      confirmLabel: 'Delete discount',
    });

    if (!approved) {
      return;
    }

    try {
      const result = await deleteDiscount(discount.id);
      toast.success(result?.message ?? 'Discount removed.');
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const valueLabel = (row) =>
    row.discount_type === 'PERCENTAGE'
      ? `${Number(row.discount_value).toFixed(2)}%`
      : formatCurrency(row.discount_value);

  const columns = [
    {
      key: 'name',
      header: 'Discount',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{titleCase(row.scope)} scope</p>
        </div>
      ),
    },
    {
      key: 'discount_value',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="font-medium text-slate-900">{valueLabel(row)}</span>,
    },
    {
      key: 'minimum_purchase',
      header: 'Min spend',
      align: 'right',
      render: (row) => formatCurrency(row.minimum_purchase),
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{formatDate(row.start_date)}</p>
          <p>to {formatDate(row.end_date)}</p>
        </div>
      ),
    },
    {
      key: 'usage_count',
      header: 'Usage',
      align: 'right',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.usage_count ?? 0}</p>
          <p className="text-xs text-slate-500">{row.maximum_usage ? `of ${row.maximum_usage}` : 'unlimited'}</p>
        </div>
      ),
    },
    {
      key: 'total_discount',
      header: 'Given',
      align: 'right',
      render: (row) => formatCurrency(row.total_discount),
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
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => toggleActive(row)} aria-label={`Toggle ${row.name}`}>
            <Power className={`h-4 w-4 ${row.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
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
        title="Discounts"
        description="Promotions and price reductions applied automatically to eligible invoices."
        actions={<Button icon={Plus} onClick={openCreate}>New discount</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search discounts…"
            className="w-full sm:w-80"
          />
          <Select
            value={list.filters.discountType ?? ''}
            onChange={(event) => list.setFilter('discountType', event.target.value)}
            placeholder="All types"
            options={[
              { value: 'PERCENTAGE', label: 'Percentage' },
              { value: 'FIXED', label: 'Fixed amount' },
            ]}
            containerClassName="w-full sm:w-44"
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
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} discounts</span>
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
              emptyTitle="No discounts yet"
              emptyDescription="Create a discount to reduce eligible invoice totals automatically."
              emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>New discount</Button>}
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
        title={modal?.mode === 'create' ? 'New discount' : 'Edit discount'}
        description="The best eligible discount is applied once per invoice."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button form="discount-form" type="submit" loading={saving}>
              {modal?.mode === 'create' ? 'Create discount' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="discount-form" onSubmit={save} className="space-y-5">
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} containerClassName="sm:col-span-2" />
            <Select
              label="Discount type"
              value={form.discountType}
              onChange={(event) => setForm((c) => ({ ...c, discountType: event.target.value }))}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage' },
                { value: 'FIXED', label: 'Fixed amount' },
              ]}
            />
            <Input
              label={form.discountType === 'PERCENTAGE' ? 'Percentage off' : 'Amount off'}
              type="number"
              min="0.01"
              max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
              step="0.01"
              required
              value={form.discountValue}
              onChange={(event) => setForm((c) => ({ ...c, discountValue: event.target.value }))}
              prefix={form.discountType === 'PERCENTAGE' ? undefined : '₹'}
              suffix={form.discountType === 'PERCENTAGE' ? '%' : undefined}
            />
            <Input label="Minimum purchase" type="number" min="0" step="0.01" value={form.minimumPurchase} onChange={(event) => setForm((c) => ({ ...c, minimumPurchase: event.target.value }))} prefix="₹" />
            <Input label="Minimum quantity" type="number" min="1" step="1" value={form.minimumQuantity} onChange={(event) => setForm((c) => ({ ...c, minimumQuantity: event.target.value }))} />
            <Input label="Start date" type="date" required value={form.startDate} onChange={(event) => setForm((c) => ({ ...c, startDate: event.target.value }))} />
            <Input label="End date" type="date" required value={form.endDate} onChange={(event) => setForm((c) => ({ ...c, endDate: event.target.value }))} />
            <Input label="Maximum usage" type="number" min="1" step="1" value={form.maximumUsage} onChange={(event) => setForm((c) => ({ ...c, maximumUsage: event.target.value }))} hint="Leave empty for unlimited." />
            <Select
              label="Scope"
              value={form.scope}
              onChange={(event) => setForm((c) => ({ ...c, scope: event.target.value }))}
              options={[
                { value: 'ALL', label: 'All invoices' },
                { value: 'PRODUCTS', label: 'Specific products' },
                { value: 'SUBSCRIPTIONS', label: 'Specific subscriptions' },
              ]}
            />
          </div>

          {form.scope === 'PRODUCTS' ? (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Applicable products</p>
              <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                {products.map((product) => (
                  <Checkbox
                    key={product.id}
                    label={product.name}
                    checked={form.productIds.includes(product.id)}
                    onChange={() => toggleId('productIds', product.id)}
                  />
                ))}
                {products.length === 0 ? <p className="text-xs text-slate-500">No products available.</p> : null}
              </div>
            </div>
          ) : null}

          {form.scope === 'SUBSCRIPTIONS' ? (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Applicable subscriptions</p>
              <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                {subscriptions.map((subscription) => (
                  <Checkbox
                    key={subscription.id}
                    label={`${subscription.subscription_number} · ${subscription.customer_name}`}
                    checked={form.subscriptionIds.includes(subscription.id)}
                    onChange={() => toggleId('subscriptionIds', subscription.id)}
                  />
                ))}
                {subscriptions.length === 0 ? <p className="text-xs text-slate-500">No subscriptions available.</p> : null}
              </div>
            </div>
          ) : null}

          <Toggle label="Active" description="Only active discounts are applied to new invoices." checked={form.isActive} onChange={(value) => setForm((c) => ({ ...c, isActive: value }))} />

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <BadgePercent className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Discounts are applied to the subtotal before tax.
          </p>
        </form>
      </Modal>
    </div>
  );
}
