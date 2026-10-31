import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Eye, Plus, Wallet } from 'lucide-react';
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
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useList from '../../hooks/useList.js';
import {
  createPayment,
  downloadPaymentReceipt,
  listPayments,
} from '../../api/payments.api.js';
import { listInvoices } from '../../api/invoices.api.js';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { formatCurrency, formatDate, titleCase, todayInputValue } from '../../utils/format.js';

const blankPayment = {
  invoiceId: '',
  paymentMethod: 'BANK_TRANSFER',
  amount: '',
  paymentDate: todayInputValue(),
  transactionReference: '',
  notes: '',
};

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === 'ADMIN' ? '/admin' : '/staff';
  const toast = useToast();
  const list = useList(listPayments, { sortBy: 'payment_date' });
  const [invoices, setInvoices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(blankPayment);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    listInvoices({ limit: 100 })
      .then((result) => {
        const open = (result.rows ?? []).filter(
          (invoice) =>
            !['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status) &&
            Number(invoice.balance_due) > 0,
        );
        setInvoices(open);
      })
      .catch(() => setInvoices([]));
  }, []);

  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === String(form.invoiceId));

  const openCreate = () => {
    setForm(blankPayment);
    setFormError('');
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.invoiceId) {
      setFormError('Select an invoice to pay.');
      return;
    }

    setSaving(true);

    try {
      const payment = await createPayment({
        invoiceId: Number(form.invoiceId),
        paymentMethod: form.paymentMethod,
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        transactionReference: form.transactionReference || null,
        notes: form.notes || null,
      });
      toast.success('Payment recorded.');
      setModalOpen(false);
      await list.reload();
      if (payment?.id) {
        navigate(`${base}/payments/${payment.id}`);
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const download = async (payment) => {
    try {
      await downloadPaymentReceipt(payment);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    {
      key: 'payment_number',
      header: 'Payment',
      sortable: true,
      render: (row) => (
        <div>
          <Link to={`${base}/payments/${row.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {row.payment_number}
          </Link>
          <p className="text-xs text-slate-500">{row.transaction_reference || 'No reference'}</p>
        </div>
      ),
    },
    {
      key: 'invoice_number',
      header: 'Invoice',
      render: (row) => (
        <Link to={`${base}/invoices/${row.invoice_id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {row.invoice_number}
        </Link>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm text-slate-900">{row.customer_name}</p>
          <p className="text-xs text-slate-500">{row.company_name || '—'}</p>
        </div>
      ),
    },
    { key: 'payment_method', header: 'Method', sortable: true, render: (row) => titleCase(row.payment_method) },
    { key: 'payment_date', header: 'Date', sortable: true, render: (row) => formatDate(row.payment_date) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (row) => <span className="font-medium text-emerald-600">{formatCurrency(row.amount, row.currency)}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <Badge tone="emerald">{titleCase(row.status)}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => download(row)} aria-label={`Receipt for ${row.payment_number}`}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/payments/${row.id}`)} aria-label={`View ${row.payment_number}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Verified collections, payment methods, and receipts."
        actions={<Button icon={Plus} onClick={openCreate}>Record payment</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search payment, invoice, reference, customer…"
            className="w-full sm:w-96"
          />
          <Select
            value={list.filters.paymentMethod ?? ''}
            onChange={(event) => list.setFilter('paymentMethod', event.target.value)}
            placeholder="All methods"
            options={PAYMENT_METHODS}
            containerClassName="w-full sm:w-44"
          />
          <span className="ml-auto text-xs text-slate-500">{list.meta?.total ?? 0} payments</span>
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
              emptyTitle="No payments recorded"
              emptyDescription="Record a payment against a confirmed invoice."
              emptyAction={<Button size="sm" icon={Plus} onClick={openCreate}>Record payment</Button>}
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record payment"
        description="Choose an open invoice and record the amount received."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button form="payment-form" type="submit" loading={saving} icon={Wallet}>
              Record payment
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={save} className="space-y-4">
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Invoice"
              required
              value={form.invoiceId}
              onChange={(event) => {
                const invoice = invoices.find((item) => String(item.id) === String(event.target.value));
                setForm((current) => ({
                  ...current,
                  invoiceId: event.target.value,
                  amount: invoice ? Number(invoice.balance_due).toFixed(2) : current.amount,
                }));
              }}
              placeholder="Select open invoice"
              options={invoices.map((invoice) => ({
                value: invoice.id,
                label: `${invoice.invoice_number} · ${invoice.customer_name} · ${formatCurrency(invoice.balance_due, invoice.currency)} due`,
              }))}
              containerClassName="sm:col-span-2"
            />
            <Select
              label="Payment method"
              value={form.paymentMethod}
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              options={PAYMENT_METHODS}
            />
            <Input
              label="Amount"
              type="number"
              min="0.01"
              max={selectedInvoice ? Number(selectedInvoice.balance_due) : undefined}
              step="0.01"
              required
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              prefix="₹"
              hint={selectedInvoice ? `Balance due ${formatCurrency(selectedInvoice.balance_due, selectedInvoice.currency)}` : undefined}
            />
            <Input
              label="Payment date"
              type="date"
              required
              value={form.paymentDate}
              onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))}
            />
            <Input
              label="Transaction reference"
              value={form.transactionReference}
              onChange={(event) => setForm((current) => ({ ...current, transactionReference: event.target.value }))}
              placeholder="Required for bank, UPI, and card"
            />
            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              containerClassName="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
