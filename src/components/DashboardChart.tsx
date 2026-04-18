"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ChartData = {
  label: string;
  enviado: number;
  active: boolean;
};

function formatShortARS(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}

function formatFullARS(value: number): string {
  return `$ ${Math.round(value).toLocaleString("es-AR")}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card-bg border border-border-color rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono text-foreground">{formatFullARS(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardChart({
  data,
  color = "#10b981",
  label = "Enviado",
}: {
  data: ChartData[];
  color?: string;
  label?: string;
}) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatShortARS}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--sidebar-hover)", opacity: 0.3 }} />
          <Bar
            dataKey="enviado"
            name={label}
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
