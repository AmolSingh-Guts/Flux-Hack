import { useEffect, useState } from 'react';
import { CalendarClock, Pencil, Plus, Power, Trash2 } from 'lucide-react';
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
import Toggle from '../../components/ui/Toggle.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import useList from '../../hooks/useList.js';
import {
  createPlan,
  deletePlan,
  listPlans,
  updatePlan,
  updatePlanStatus,
} from '../../api/plans.api.js';
import { productOptions } from '../../api/products.api.js';
import { BILLING_FREQUENCIES } from '../../utils/constants.js';
import { formatCurrency, formatDate, titleCase, todayInputValue } from '../../utils/format.js';

function blankPlan() {
  return {
    name: '',
    productId: '',
    billingFrequency: 'MONTHLY',
    price: '',
    minQuantity: 1,
    startDate: todayInputValue(),
    endDate: '',
    autoClose: true,
    allowEarlyClosure: true,
    allowPause: true,
    allowRenewal: true,
    status: 'ACTIVE',
    description: '',
  };
}

export default function PlansPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useList(listPlans, { sortBy: 'created_at' });
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blankPlan);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    productOptions()
      .then((rows) => setProducts(rows ?? []))
      .catch(() => setProducts([]));
  }, []);

  const openCreate = () => {
    setForm(blankPlan());
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name ?? '',
      productId: plan.product_id ?? '',
      billingFrequency: plan.billing_frequency ?? 'MONTHLY',
      price: plan.price ?? '',
      minQuantity: plan.minimum_quantity ?? 1,
      startDate: plan.start_date ?? todayInputValue(),
      endDate: plan.end_date ?? '',
      autoClose: Boolean(plan.auto_close),
      allowEarlyClosure: Boolean(plan.allow_early_closure),
      allowPause: Boolean(plan.allow_pause),
      allowRenewal: Boolean(plan.allow_renewal),
      status: plan.status ?? 'ACTIVE',
      description: plan.description ?? '',
    });
    setFormError('');
    setModal({ mode: 'edit', plan });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      productId: Number(form.productId),
      billingFrequency: form.billingFrequency,
      price: Number(form.price || 0),
      minQuantity: Number(form.minQuantity || 1),
      startDate: form.startDate,
      endDate: form.endDate || null,
      autoClose: form.autoClose,
      allowEarlyClosure: form.allowEarlyClosure,
      allowPause: form.allowPause,
      allowRenewal: form.allowRenewal,
      status: form.status,
      description: form.description || null,
    };

    try {
      if (modal.mode === 'create') {
        await createPlan(payload);
        toast.success('Plan created.');
      } else {
        await updatePlan(modal.plan.id, payload);
        toast.success('Plan updated.');
      }
      setModal(null);
      await list.reload();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (plan) => {
    const next = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await updatePlanStatus(plan.id, next);
      toast.success(`Plan ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async (plan) => {
    const approved = await confirm({
      title: `Delete ${plan.name}?`,
      message: 'Plans with subscriptions cannot be deleted. Deactivate them instead.',
      confirmLabel: 'Delete plan',
    });

    if (!approved) {
      return;
    }

    try {
      const result = await deletePlan(plan.id);
      toast.success(result?.message ?? 'Plan removed.');
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Plan',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.product_name}</p>
        </div>
      ),
    },
    {
      key: 'billing_frequency',
      header: 'Billing',
      sortable: true,
      render: (row) => (
        <Badge tone="violet" dot={false}>
          {titleCase(row.billing_frequency)}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{formatCurrency(row.price, row.currency)}</p>
          <p className="text-xs text-slate-500">per {row.billing_frequency.toLowerCase()}</p>
        </div>
      ),
    },
    {
      key: 'minimum_quantity',
      header: 'Min qty',
      align: 'right',
      render: (row) => row.minimum_quantity ?? 1,
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>From {formatDate(row.start_date)}</p>
          <p>To {row.end_date ? formatDate(row.end_date) : 'Open'}</p>
        </div>
      ),
    },
    {
      key: 'subscription_count',
      header: 'Subscriptions',
      align: 'right',
      render: (row) => row.subscription_count ?? 0,
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => toggleStatus(row)} aria-label={`${row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${row.name}`}>
            <Power className={`h-4 w-4 ${row.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
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
        title="Plans"
        description="Reusable pricing and billing rules for subscriptions."
        actions={<Button icon={Plus} onClick={openCreate}>New plan</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search plans or products…"
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
          <Select
            value={list.filters.billingFrequency ?? ''}
            onChange={(event) => list.setFilter('billingFrequency', event.target.value)}
            placeholder="All frequencies"
            options={BILLING_FREQUENCIES}
            containerClassName="w-full sm:w-44"
          />
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} plans</span>
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
              emptyTitle="No plans yet"
              emptyDescription="Create a plan to define how a product is billed."
              emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>New plan</Button>}
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
        title={modal?.mode === 'create' ? 'New plan' : 'Edit plan'}
        description="Plans control billing frequency, price, and lifecycle rules."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button form="plan-form" type="submit" loading={saving}>
              {modal?.mode === 'create' ? 'Create plan' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={save} className="space-y-5">
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Plan name" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} containerClassName="sm:col-span-2" />
            <Select
              label="Product"
              required
              value={form.productId}
              onChange={(event) => setForm((c) => ({ ...c, productId: event.target.value }))}
              placeholder="Select product"
              options={products.map((product) => ({ value: product.id, label: product.name }))}
            />
            <Select
              label="Billing frequency"
              required
              value={form.billingFrequency}
              onChange={(event) => setForm((c) => ({ ...c, billingFrequency: event.target.value }))}
              options={BILLING_FREQUENCIES}
            />
            <Input label="Price" type="number" min="0.01" step="0.01" required value={form.price} onChange={(event) => setForm((c) => ({ ...c, price: event.target.value }))} prefix="₹" />
            <Input label="Minimum quantity" type="number" min="1" step="1" value={form.minQuantity} onChange={(event) => setForm((c) => ({ ...c, minQuantity: event.target.value }))} />
            <Input label="Start date" type="date" required value={form.startDate} onChange={(event) => setForm((c) => ({ ...c, startDate: event.target.value }))} />
            <Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm((c) => ({ ...c, endDate: event.target.value }))} hint="Leave empty for an open-ended plan." />
            <Textarea label="Description" rows={2} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} containerClassName="sm:col-span-2" />
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

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <Toggle label="Auto close" description="Close when the plan end date is reached." checked={form.autoClose} onChange={(value) => setForm((c) => ({ ...c, autoClose: value }))} />
            <Toggle label="Allow early closure" description="Customers can close before expiry." checked={form.allowEarlyClosure} onChange={(value) => setForm((c) => ({ ...c, allowEarlyClosure: value }))} />
            <Toggle label="Allow pause" description="Subscriptions can be paused." checked={form.allowPause} onChange={(value) => setForm((c) => ({ ...c, allowPause: value }))} />
            <Toggle label="Allow renewal" description="Subscriptions can be renewed." checked={form.allowRenewal} onChange={(value) => setForm((c) => ({ ...c, allowRenewal: value }))} />
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Changing the price creates a new price record and keeps historical invoices intact.
          </p>
        </form>
      </Modal>
    </div>
  );
}
