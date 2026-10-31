import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColors, compactCurrency, paymentMethodColor, statusColor } from './chartTheme.js';
import { titleCase } from '../../utils/format.js';

const axisStyle = { fontSize: 11, fill: '#64748b' };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
  fontSize: 12,
};

export function RevenueAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.brand} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColors.brand} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compactCurrency} width={56} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [compactCurrency(value), 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColors.brand}
          strokeWidth={2.5}
          fill="url(#revenueFill)"
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GrowthLineChart({ data, dataKey = 'value', label = 'Subscriptions' }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={label}
          stroke={chartColors.emerald}
          strokeWidth={2.5}
          dot={{ r: 3, strokeWidth: 0, fill: chartColors.emerald }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data, height = 260 }) {
  const chartData = data
    .filter((item) => Number(item.count) > 0)
    .map((item) => ({
      name: titleCase(item.status),
      value: Number(item.count),
      color: statusColor[item.status] ?? chartColors.slate,
    }));

  if (chartData.length === 0) {
    return (
      <div className="grid h-[220px] place-items-center text-sm text-slate-400">
        No invoice data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PaymentMethodBarChart({ data }) {
  const chartData = data.map((item) => ({
    name: titleCase(item.method),
    amount: Number(item.amount),
    color: paymentMethodColor[item.method] ?? chartColors.slate,
  }));

  if (chartData.length === 0) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-slate-400">
        No payments in this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compactCurrency} width={56} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [compactCurrency(value), 'Collected']}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBarChart({ data, dataKey = 'revenue', label = 'Revenue' }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={compactCurrency} width={56} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [compactCurrency(value), label]}
        />
        <Bar dataKey={dataKey} name={label} fill={chartColors.brand} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
