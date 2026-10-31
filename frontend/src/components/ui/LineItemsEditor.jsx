import { Plus, Trash2 } from 'lucide-react';
import Button from './Button.jsx';
import Input from './Input.jsx';
import { computeLines, newLine } from '../../utils/lineItems.js';
import { formatCurrency } from '../../utils/format.js';

const gridWithPlans =
  'lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,1.1fr)_auto]';
const gridWithoutPlans =
  'lg:grid lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,1.1fr)_auto]';

const selectClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export default function LineItemsEditor({
  lines,
  onChange,
  products,
  plans = [],
  showPlans = false,
  currency = 'INR',
  error,
  disabled = false,
}) {
  const { rows, totals } = computeLines(lines, products, plans);

  const updateLine = (index, changes) => {
    onChange(
      lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...changes } : line,
      ),
    );
  };

  const onProductChange = (index, productId) => {
    const nextProduct = products.find((item) => String(item.id) === String(productId));

    updateLine(index, {
      productId,
      variantId: '',
      planId: '',
      unitPrice: '',
      description: '',
      quantity: Math.max(1, Number(nextProduct?.minimum_quantity ?? 1)),
    });
  };

  return (
    <div className="space-y-3">
      <div
        className={`hidden gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${
          showPlans ? gridWithPlans : gridWithoutPlans
        }`}
      >
        <span>Product</span>
        <span>Variant</span>
        {showPlans ? <span>Plan</span> : null}
        <span>Qty</span>
        <span>Unit price</span>
        <span>Discount</span>
        <span>Tax</span>
        <span className="text-right">Line total</span>
        <span className="w-8" />
      </div>

      {lines.map((line, index) => {
        const product = products.find((item) => String(item.id) === String(line.productId));
        const row = rows[index];

        return (
          <div
            key={index}
            className={`grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 ${
              showPlans ? gridWithPlans : gridWithoutPlans
            } lg:items-start`}
          >
            <select
              aria-label={`Line ${index + 1} product`}
              value={line.productId}
              onChange={(event) => onProductChange(index, event.target.value)}
              disabled={disabled}
              className={selectClass}
            >
              <option value="">Select product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              aria-label={`Line ${index + 1} variant`}
              value={line.variantId}
              onChange={(event) =>
                updateLine(index, { variantId: event.target.value, unitPrice: '' })
              }
              disabled={disabled || !product?.variants?.length}
              className={selectClass}
            >
              <option value="">No variant</option>
              {(product?.variants ?? []).map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                  {Number(variant.additional_price) > 0
                    ? ` (+${formatCurrency(variant.additional_price, currency)})`
                    : ''}
                </option>
              ))}
            </select>

            {showPlans ? (
              <select
                aria-label={`Line ${index + 1} plan`}
                value={line.planId}
                onChange={(event) =>
                  updateLine(index, { planId: event.target.value, unitPrice: '' })
                }
                disabled={disabled}
                className={selectClass}
              >
                <option value="">No plan</option>
                {plans
                  .filter(
                    (plan) =>
                      !line.productId || String(plan.product_id) === String(line.productId),
                  )
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
              </select>
            ) : null}

            <Input
              aria-label={`Line ${index + 1} quantity`}
              type="number"
              min="1"
              step="1"
              value={line.quantity}
              onChange={(event) => updateLine(index, { quantity: event.target.value })}
              disabled={disabled}
            />

            <Input
              aria-label={`Line ${index + 1} unit price`}
              type="number"
              min="0"
              step="0.01"
              value={line.unitPrice}
              onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
              placeholder={row ? row.unitPrice.toFixed(2) : '0.00'}
              disabled={disabled}
            />

            <Input
              aria-label={`Line ${index + 1} discount`}
              type="number"
              min="0"
              step="0.01"
              value={line.discountAmount}
              onChange={(event) => updateLine(index, { discountAmount: event.target.value })}
              placeholder="0.00"
              disabled={disabled}
            />

            <div className="flex h-10 items-center text-xs text-slate-500">
              {row ? `${row.taxRate.toFixed(2)}%` : '—'}
            </div>

            <div className="flex h-10 items-center justify-end text-sm font-medium text-slate-900">
              {row ? formatCurrency(row.lineTotal, currency) : '—'}
            </div>

            <div className="flex h-10 items-center justify-end">
              <button
                type="button"
                onClick={() => onChange(lines.filter((_, lineIndex) => lineIndex !== index))}
                disabled={disabled || lines.length === 1}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remove line ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...lines, newLine()])} disabled={disabled}>
          Add line
        </Button>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-slate-500">
            Subtotal{' '}
            <span className="font-medium text-slate-900">{formatCurrency(totals.subtotal, currency)}</span>
          </span>
          <span className="text-slate-500">
            Discount{' '}
            <span className="font-medium text-slate-900">{formatCurrency(totals.discountAmount, currency)}</span>
          </span>
          <span className="text-slate-500">
            Tax{' '}
            <span className="font-medium text-slate-900">{formatCurrency(totals.taxAmount, currency)}</span>
          </span>
          <span className="text-slate-600">
            Total{' '}
            <span className="text-base font-semibold text-slate-900">
              {formatCurrency(totals.totalAmount, currency)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
