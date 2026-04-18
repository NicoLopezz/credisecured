import { prisma } from "@/lib/prisma";
import { formatARS, formatNumber } from "@/lib/format";
import Link from "next/link";
import MonthlyChart from "@/components/MonthlyChart";

export default async function DashboardPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [
    totalEmpresas,
    totalClientes,
    totalProveedores,
    totalOperaciones,
    totalCupos,
    totalPedidos,
    operacionesRecientes,
    volumenOperaciones,
    volumenCupos,
    volumenPedidos,
    // Status breakdown
    opsPendientes,
    opsEnviadas,
    opsCompletadas,
    // Cupo utilization
    cupoAgg,
    // Pedido utilization
    pedidoAgg,
    // Monthly data (last 6 months of operations)
    monthlyOps,
    monthlyCupos,
    monthlyPedidos,
  ] = await Promise.all([
    prisma.empresa.count(),
    prisma.empresa.count({ where: { esCliente: true } }),
    prisma.empresa.count({ where: { esProveedor: true } }),
    prisma.operacion.count(),
    prisma.cupoProveedor.count(),
    prisma.pedidoCliente.count(),
    prisma.operacion.findMany({
      take: 8,
      orderBy: { fecha: "desc" },
      include: {
        cliente: { select: { razonSocial: true } },
        proveedor: { select: { razonSocial: true } },
      },
    }),
    prisma.operacion.aggregate({ _sum: { importe: true } }),
    prisma.cupoProveedor.aggregate({ _sum: { importe: true } }),
    prisma.pedidoCliente.aggregate({ _sum: { importe: true } }),
    // Status counts
    prisma.operacion.count({ where: { status: "Pendiente" } }),
    prisma.operacion.count({ where: { status: "Enviado" } }),
    prisma.operacion.count({ where: { status: "Completado" } }),
    // Cupo aggregates
    prisma.cupoProveedor.aggregate({
      _sum: {
        importe: true,
        cupoRestante: true,
        cupoEnviado: true,
        cupoPendiente: true,
      },
    }),
    // Pedido aggregates
    prisma.pedidoCliente.aggregate({
      _sum: { importe: true, pedidoRestante: true },
    }),
    // Monthly operations grouped
    prisma.operacion.groupBy({
      by: ["anio", "mes"],
      _sum: { importe: true },
      _count: true,
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      take: 6,
    }),
    // Monthly cupos grouped
    prisma.cupoProveedor.groupBy({
      by: ["anio", "mes"],
      _sum: { importe: true },
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      take: 6,
    }),
    // Monthly pedidos grouped
    prisma.pedidoCliente.groupBy({
      by: ["anio", "mes"],
      _sum: { importe: true },
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      take: 6,
    }),
  ]);

  // Top proveedores & clientes
  const topProveedores = await prisma.operacion.groupBy({
    by: ["proveedorId"],
    _sum: { importe: true },
    _count: true,
    orderBy: { _sum: { importe: "desc" } },
    take: 5,
  });
  const proveedoresIds = topProveedores.map((p) => p.proveedorId);
  const proveedoresData = await prisma.empresa.findMany({
    where: { id: { in: proveedoresIds } },
    select: { id: true, razonSocial: true },
  });
  const provMap = new Map(proveedoresData.map((p) => [p.id, p.razonSocial]));

  const topClientes = await prisma.operacion.groupBy({
    by: ["clienteId"],
    _sum: { importe: true },
    _count: true,
    orderBy: { _sum: { importe: "desc" } },
    take: 5,
  });
  const clientesIds = topClientes.map((c) => c.clienteId);
  const clientesData = await prisma.empresa.findMany({
    where: { id: { in: clientesIds } },
    select: { id: true, razonSocial: true },
  });
  const cliMap = new Map(clientesData.map((c) => [c.id, c.razonSocial]));

  // Bar chart scaling
  const maxProvVol = Math.max(
    ...topProveedores.map((p) => Number(p._sum.importe) || 0),
    1
  );
  const maxCliVol = Math.max(
    ...topClientes.map((c) => Number(c._sum.importe) || 0),
    1
  );

  // Build monthly chart data (last 6 months, chronological order)
  const monthNames = [
    "",
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const opsMap = new Map(
    monthlyOps.map((m) => [`${m.anio}-${m.mes}`, Number(m._sum.importe) || 0])
  );
  const cuposMap = new Map(
    monthlyCupos.map((m) => [
      `${m.anio}-${m.mes}`,
      Number(m._sum.importe) || 0,
    ])
  );
  const pedidosMap = new Map(
    monthlyPedidos.map((m) => [
      `${m.anio}-${m.mes}`,
      Number(m._sum.importe) || 0,
    ])
  );

  // Generate last 6 months keys in order
  const monthKeys: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    monthKeys.push({
      key: `${y}-${m}`,
      label: `${monthNames[m]} ${String(y).slice(2)}`,
    });
  }

  const chartData = monthKeys.map(({ key, label }) => ({
    label,
    cupos: cuposMap.get(key) || 0,
    pedidos: pedidosMap.get(key) || 0,
    operaciones: opsMap.get(key) || 0,
  }));

  // Cupo utilization numbers
  const cupoTotal = Number(cupoAgg._sum.importe) || 0;
  const cupoRestante = Number(cupoAgg._sum.cupoRestante) || 0;
  const cupoEnviado = Number(cupoAgg._sum.cupoEnviado) || 0;
  const cupoPendiente = Number(cupoAgg._sum.cupoPendiente) || 0;
  const cupoUsado = cupoTotal - cupoRestante;
  const cupoUsadoPct = cupoTotal > 0 ? (cupoUsado / cupoTotal) * 100 : 0;

  // Pedido utilization
  const pedidoTotal = Number(pedidoAgg._sum.importe) || 0;
  const pedidoRestante = Number(pedidoAgg._sum.pedidoRestante) || 0;
  const pedidoUsado = pedidoTotal - pedidoRestante;
  const pedidoUsadoPct = pedidoTotal > 0 ? (pedidoUsado / pedidoTotal) * 100 : 0;

  // Status total for percentage
  const statusTotal = opsPendientes + opsEnviadas + opsCompletadas || 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-muted mt-1">
              Resumen general de operaciones, cupos y pedidos.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Link
              href="/dashboard/proveedores"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
            >
              Proveedores
            </Link>
            <Link
              href="/dashboard/clientes"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              Clientes
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse-dot" />
          Sistema activo
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Empresas"
          value={formatNumber(totalEmpresas)}
          subtitle={`${formatNumber(totalClientes)} clientes · ${formatNumber(totalProveedores)} proveedores`}
          icon={<BuildingIcon />}
          accentColor="text-blue-400"
          borderColor="border-blue-500/30"
          href="/empresas"
        />
        <StatCard
          title="Operaciones"
          value={formatNumber(totalOperaciones)}
          subtitle={`Vol: ${formatARS(volumenOperaciones._sum.importe)}`}
          icon={<ArrowsIcon />}
          accentColor="text-emerald-400"
          borderColor="border-emerald-500/30"
          href="/operaciones"
        />
        <StatCard
          title="Cupos"
          value={formatNumber(totalCupos)}
          subtitle={`Vol: ${formatARS(volumenCupos._sum.importe)}`}
          icon={<CoinIcon />}
          accentColor="text-amber-400"
          borderColor="border-amber-500/30"
          href="/cupos"
        />
        <StatCard
          title="Pedidos"
          value={formatNumber(totalPedidos)}
          subtitle={`Vol: ${formatARS(volumenPedidos._sum.importe)}`}
          icon={<DocumentIcon />}
          accentColor="text-cyan-400"
          borderColor="border-cyan-500/30"
          href="/pedidos"
        />
      </div>

      {/* Row 2: Monthly Chart (full width) */}
      <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-color">
          <h2 className="text-sm font-semibold text-foreground">
            Totales por Mes
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />
              Cupos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#06b6d4]" />
              Pedidos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#10b981]" />
              Operaciones
            </span>
          </div>
        </div>
        <div className="px-3 pt-2 pb-1">
          <MonthlyChart data={chartData} />
        </div>
      </div>

      {/* Row 3: Status + Cupos + Pedidos (3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Operations by Status */}
        <div className="bg-card-bg rounded-xl border border-border-color p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Operaciones por Estado
          </h2>
          <div className="space-y-2.5">
            <StatusRow
              label="Pendiente"
              count={opsPendientes}
              total={statusTotal}
              color="bg-amber-500"
              textColor="text-amber-400"
            />
            <StatusRow
              label="Enviado"
              count={opsEnviadas}
              total={statusTotal}
              color="bg-blue-500"
              textColor="text-blue-400"
            />
            <StatusRow
              label="Completado"
              count={opsCompletadas}
              total={statusTotal}
              color="bg-emerald-500"
              textColor="text-emerald-400"
            />
          </div>
        </div>

        {/* Cupo Utilization */}
        <div className="bg-card-bg rounded-xl border border-border-color p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-foreground">
              Cupos — Utilizacion
            </h2>
            <span className="text-xs font-mono text-amber-400">
              {cupoUsadoPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-border-color overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-amber-500/70"
              style={{ width: `${cupoUsadoPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Total</span>
              <span className="font-mono text-foreground">
                {formatARS(cupoTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Restante</span>
              <span className="font-mono text-foreground">
                {formatARS(cupoRestante)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Enviado</span>
              <span className="font-mono text-blue-400">
                {formatARS(cupoEnviado)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Pendiente</span>
              <span className="font-mono text-amber-400">
                {formatARS(cupoPendiente)}
              </span>
            </div>
          </div>
        </div>

        {/* Pedido Utilization */}
        <div className="bg-card-bg rounded-xl border border-border-color p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-foreground">
              Pedidos — Utilizacion
            </h2>
            <span className="text-xs font-mono text-cyan-400">
              {pedidoUsadoPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-border-color overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-cyan-500/70"
              style={{ width: `${pedidoUsadoPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Total</span>
              <span className="font-mono text-foreground">
                {formatARS(pedidoTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Restante</span>
              <span className="font-mono text-foreground">
                {formatARS(pedidoRestante)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Operations Table + Rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Recent Operations Table */}
        <div className="xl:col-span-2 bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
            <h2 className="text-sm font-semibold text-foreground">
              Ultimas Operaciones
            </h2>
            <Link
              href="/operaciones"
              className="text-xs text-accent hover:text-accent-hover cursor-pointer"
            >
              Ver todas
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted text-left bg-background/50">
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Proveedor</th>
                  <th className="px-6 py-3 font-medium text-right">Importe</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/50">
                {operacionesRecientes.map((op) => (
                  <tr
                    key={op.id}
                    className="hover:bg-card-bg-hover transition-colors duration-150"
                  >
                    <td className="px-6 py-3.5 text-foreground font-medium">
                      {op.cliente.razonSocial}
                    </td>
                    <td className="px-6 py-3.5 text-foreground/80">
                      {op.proveedor.razonSocial}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-emerald-400">
                      {formatARS(op.importe)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={op.status} />
                    </td>
                  </tr>
                ))}
                {operacionesRecientes.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-muted text-sm"
                    >
                      No hay operaciones registradas aun.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rankings Column */}
        <div className="space-y-4">
          {/* Top Proveedores */}
          <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
              <h2 className="text-sm font-semibold text-foreground">
                Top Proveedores
              </h2>
              <Link href="/dashboard/proveedores" className="text-xs text-accent hover:text-accent-hover transition-colors">
                Ver dashboard &rarr;
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {topProveedores.map((p, i) => {
                const pct =
                  ((Number(p._sum.importe) || 0) / maxProvVol) * 100;
                return (
                  <div key={p.proveedorId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-muted w-4 text-right flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground truncate">
                          {provMap.get(p.proveedorId) || "\u2014"}
                        </p>
                      </div>
                      <p className="text-xs font-mono text-emerald-400 flex-shrink-0 ml-2">
                        {formatARS(p._sum.importe)}
                      </p>
                    </div>
                    <div className="ml-6.5 h-1 rounded-full bg-border-color overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {topProveedores.length === 0 && (
                <p className="text-sm text-muted text-center py-4">
                  Sin datos
                </p>
              )}
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
              <h2 className="text-sm font-semibold text-foreground">
                Top Clientes
              </h2>
              <Link href="/dashboard/clientes" className="text-xs text-accent hover:text-accent-hover transition-colors">
                Ver dashboard &rarr;
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {topClientes.map((c, i) => {
                const pct =
                  ((Number(c._sum.importe) || 0) / maxCliVol) * 100;
                return (
                  <div key={c.clienteId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-muted w-4 text-right flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground truncate">
                          {cliMap.get(c.clienteId) || "\u2014"}
                        </p>
                      </div>
                      <p className="text-xs font-mono text-blue-400 flex-shrink-0 ml-2">
                        {formatARS(c._sum.importe)}
                      </p>
                    </div>
                    <div className="ml-6.5 h-1 rounded-full bg-border-color overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {topClientes.length === 0 && (
                <p className="text-sm text-muted text-center py-4">
                  Sin datos
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ── */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  borderColor,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  borderColor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`group bg-card-bg rounded-xl border ${borderColor} p-5 hover:bg-card-bg-hover transition-colors duration-200 cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted uppercase tracking-wider">
          {title}
        </p>
        <span
          className={`${accentColor} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted mt-1.5">{subtitle}</p>
    </Link>
  );
}

/* ── Status Row (for breakdown) ── */

function StatusRow({
  label,
  count,
  total,
  color,
  textColor,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  textColor: string;
}) {
  const pct = (count / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${textColor}`}>
            {formatNumber(count)}
          </span>
          <span className="text-[10px] text-muted">
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-border-color overflow-hidden">
        <div
          className={`h-full rounded-full ${color}/60`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Status Badge ── */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; dot: string }> = {
    Enviado: { bg: "bg-blue-500/10 text-blue-400", dot: "bg-blue-400" },
    Pendiente: {
      bg: "bg-amber-500/10 text-amber-400",
      dot: "bg-amber-400",
    },
    Completado: {
      bg: "bg-emerald-500/10 text-emerald-400",
      dot: "bg-emerald-400",
    },
  };
  const s = styles[status] || {
    bg: "bg-gray-500/10 text-gray-400",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

/* ── Inline SVG Icons ── */

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function ArrowsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
