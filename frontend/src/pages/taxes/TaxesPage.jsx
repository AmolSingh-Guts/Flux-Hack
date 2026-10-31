import { useState } from 'react';
import { Pencil, Percent, Plus, Power, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
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
  createTax,
  deleteTax,
  listTaxes,
  updateTax,
} from '../../api/taxes.api.js';
import { formatDate } from '../../utils/format.js';

const blank = {
  name: '',
  percentage: '',
  taxType: 'GST',
  description: '',
  isActive: true,
};

export default function TaxesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useList(listTaxes, { sortBy: 'created_at' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setForm(blank);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (tax) => {
    setForm({
      name: tax.name ?? '',
      percentage: tax.percentage ?? '',
      taxType: tax.tax_type ?? 'GST',
      description: tax.description ?? '',
      isActive: Boolean(tax.is_active),
    });
    setFormError('');
    setModal({ mode: 'edit', tax });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      percentage: Number(form.percentage || 0),
      taxType: form.taxType.trim(),
      description: form.description || null,
      isActive: form.isActive,
    };

    try {
      if (modal.mode === 'create') {
        await createTax(payload);
        toast.success('Tax rule created.');
      } else {
        await updateTax(modal.tax.id, payload);
        toast.success('Tax rule updated.');
      }
      setModal(null);
      await list.reload();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tax) => {
    try {
      await updateTax(tax.id, { isActive: !tax.is_active });
      toast.success(`Tax rule ${tax.is_active ? 'deactivated' : 'activated'}.`);
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async (tax) => {
    const approved = await confirm({
      title: `Delete ${tax.name}?`,
      message: 'Tax rules linked to products are deactivated instead of deleted.',
      confirmLabel: 'Delete tax rule',
    });

    if (!approved) {
      return;
    }

    try {
      const result = await deleteTax(tax.id);
      toast.success(result?.message ?? 'Tax rule removed.');
      await list.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Tax rule',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.description || row.tax_type}</p>
        </div>
      ),
    },
    { key: 'tax_type', header: 'Type' },
    {
      key: 'percentage',
      header: 'Rate',
      align: 'right',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{Number(row.percentage).toFixed(2)}%</span>,
    },
    {
      key: 'product_count',
      header: 'Products',
      align: 'right',
      render: (row) => row.product_count ?? 0,
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
        title="Taxes"
        description="Tax rates applied to product lines on quotations, subscriptions, and invoices."
        actions={<Button icon={Plus} onClick={openCreate}>New tax rule</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search tax rules…"
            className="w-full sm:w-80"
          />
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} tax rules</span>
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
              emptyTitle="No tax rules yet"
              emptyDescription="Add GST, VAT, or other tax rates used by your products."
              emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>New tax rule</Button>}
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
        title={modal?.mode === 'create' ? 'New tax rule' : 'Edit tax rule'}
        description="Attach tax rules to products. Line totals are calculated automatically."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button form="tax-form" type="submit" loading={saving}>
              {modal?.mode === 'create' ? 'Create tax rule' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="tax-form" onSubmit={save} className="space-y-4">
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} placeholder="GST 18%" containerClassName="sm:col-span-2" />
            <Input label="Percentage" type="number" min="0" max="100" step="0.01" required value={form.percentage} onChange={(event) => setForm((c) => ({ ...c, percentage: event.target.value }))} suffix="%" />
            <Input label="Tax type" required value={form.taxType} onChange={(event) => setForm((c) => ({ ...c, taxType: event.target.value }))} placeholder="GST" />
            <Textarea label="Description" rows={2} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} containerClassName="sm:col-span-2" />
          </div>
          <Toggle label="Active" description="Only active tax rules can be applied to products." checked={form.isActive} onChange={(value) => setForm((c) => ({ ...c, isActive: value }))} />
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Percent className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Multiple taxes on a product are summed on each line.
          </p>
        </form>
      </Modal>
    </div>
  );
}
