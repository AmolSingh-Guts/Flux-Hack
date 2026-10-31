import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardBody, CardHeader } from '../../components/ui/Card.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import RangeFilter from '../../components/dashboard/RangeFilter.jsx';
import {
  GrowthLineChart,
  MonthlyBarChart,
  PaymentMethodBarChart,
  StatusPieChart,
} from '../../components/dashboard/charts.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useAsync from '../../hooks/useAsync.js';
import { exportReport, reportSummary } from '../../api/dashboard.api.js';
import {
  addDaysInputValue,
  formatCurrency,
  formatDate,
  monthStartInputValue,
} from '../../utils/format.js';

const exportTypes = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'payments', label: 'Payments' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'customers', label: 'Customers' },
  { value: 'overdue', label: 'Overdue invoices' },
];

const empty = {
  cards: {},
  monthlyRevenue: [],
  yearlyRevenue: [],
  paymentMethods: [],
  subscriptionGrowth: [],
  invoiceStatus: [],
  topCustomers: [],
};

export default function ReportsPage() {
  const toast = useToast();
  const initial = useMemo(
    () => ({ from: monthStartInputValue(), to: addDaysInputValue(0) }),
    [],
  );
  const [draft, setDraft] = useState(initial);
  const [range, setRange] = useState(initial);
  const [exporting, setExporting] = useState('');

  const { data, loading, error, reload } = useAsync(
    () => reportSummary(range),
    [range.from, range.to],
  );
  const report = data ?? empty;
  const cards = report.cards;

  const monthly = report.monthlyRevenue.map((row) => ({ ...row, label: row.month }));
  const growth = report.subscriptionGrowth.map((row) => ({
    ...row,
    label: row.month,
    value: row.subscriptions,
  }));

  const exportCsv = async (type) => {
    setExporting(type);

    try {
      await exportReport({ type, from: range.from, to: range.to });
      toast.success(`${exportTypes.find((item) => item.value === type)?.label} report downloaded.`);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setExporting('');
    }
  };

  const customerColumns = [
    { key: 'name', header: 'Customer' },
    { key: 'companyName', header: 'Company', render: (row) => row.companyName || '—' },
    { key: 'payments', header: 'Payments', align: 'right' },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.revenue)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Revenue, collections, subscriptions, and receivables for the selected period."
        actions={
          <RangeFilter
            from={draft.from}
            to={draft.to}
            onFromChange={(value) => setDraft((current) => ({ ...current, from: value }))}
            onToChange={(value) => setDraft((current) => ({ ...current, to: value }))}
            onApply={() => setRange(draft)}
            onReset={() => {
              setDraft(initial);
              setRange(initial);
            }}
            loading={loading}
          />
        }
      />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue in range"
              value={formatCurrency(cards.totalRevenue)}
              hint={`${formatCurrency(cards.allTimeRevenue)} all time`}
              icon={TrendingUp}
              tone="emerald"
              loading={loading}
            />
            <StatCard
              label="Payments in range"
              value={cards.paymentsInRange ?? 0}
              hint={`Average ${formatCurrency(cards.averagePayment)}`}
              icon={FileSpreadsheet}
              tone="brand"
              loading={loading}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(cards.outstandingPayments)}
              hint={`${cards.overdueInvoices ?? 0} overdue invoices`}
              icon={Download}
              tone="rose"
              loading={loading}
            />
            <StatCard
              label="Active subscriptions"
              value={cards.activeSubscriptions ?? 0}
              hint={`${cards.newSubscriptions ?? 0} new in range`}
              icon={TrendingUp}
              tone="violet"
              loading={loading}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Monthly revenue" description="Collected payments by month." />
              <CardBody>
                <MonthlyBarChart data={monthly} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Invoice status" description="Value distribution by status." />
              <CardBody>
                <StatusPieChart data={report.invoiceStatus} />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Payment methods" description="Collections by payment method." />
              <CardBody>
                <PaymentMethodBarChart data={report.paymentMethods} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Subscription growth" description="New subscriptions per month." />
              <CardBody>
                <GrowthLineChart data={growth} />
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Top customers" description="Highest revenue in the selected period." />
              <CardBody className="p-0">
                <DataTable
                  columns={customerColumns}
                  rows={report.topCustomers ?? []}
                  emptyTitle="No customer revenue in this period"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Export" description="Download CSV files for the selected period." />
              <CardBody>
                <div className="grid gap-2 sm:grid-cols-2">
                  {exportTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant="secondary"
                      size="sm"
                      icon={Download}
                      loading={exporting === type.value}
                      onClick={() => exportCsv(type.value)}
                      className="justify-start"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Range {formatDate(range.from)} – {formatDate(range.to)}. All figures come from live records.
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Yearly revenue" description="All-time totals by year." />
            <CardBody className="p-0">
              <DataTable
                columns={[
                  { key: 'year', header: 'Year' },
                  { key: 'payments', header: 'Payments', align: 'right' },
                  {
                    key: 'revenue',
                    header: 'Revenue',
                    align: 'right',
                    render: (row) => formatCurrency(row.revenue),
                  },
                ]}
                rows={report.yearlyRevenue ?? []}
                emptyTitle="No revenue recorded"
              />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
