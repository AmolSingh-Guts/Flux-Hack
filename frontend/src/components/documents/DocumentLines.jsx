import { formatCurrency } from '../../utils/format.js';

export default function DocumentLines({
  lines = [],
  totals = {},
  currency = 'INR',
  showPlan = false,
  className = '',
}) {
  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 text-right font-semibold">Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Unit price</th>
              <th className="px-4 py-3 text-right font-semibold">Discount</th>
              <th className="px-4 py-3 text-right font-semibold">Tax</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.id ?? `${line.description}-${line.sort_order}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {line.description || line.product_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[line.product_name, line.variant_name, showPlan ? line.plan_name : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{Number(line.quantity).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(line.unit_price, currency)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(line.discount_amount, currency)}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  <p>{formatCurrency(line.tax_amount, currency)}</p>
                  <p className="text-xs text-slate-400">{Number(line.tax_rate).toFixed(2)}%</p>
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(line.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 w-full max-w-xs space-y-2 px-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Subtotal</dt>
          <dd className="font-medium text-slate-900">{formatCurrency(totals.subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Discount</dt>
          <dd className="font-medium text-slate-900">{formatCurrency(totals.discount_amount, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Tax</dt>
          <dd className="font-medium text-slate-900">{formatCurrency(totals.tax_amount, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
          <dt className="font-semibold text-slate-900">Total</dt>
          <dd className="text-base font-semibold text-slate-900">{formatCurrency(totals.total_amount, currency)}</dd>
        </div>
        {totals.amount_paid !== undefined ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Amount paid</dt>
              <dd className="font-medium text-emerald-600">{formatCurrency(totals.amount_paid, currency)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
              <dt className="font-semibold text-slate-900">Balance due</dt>
              <dd className="font-semibold text-rose-600">{formatCurrency(totals.balance_due, currency)}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  );
}
