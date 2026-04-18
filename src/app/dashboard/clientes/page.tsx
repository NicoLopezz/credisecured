import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import DashboardChart from "@/components/DashboardChart";
import Link from "next/link";

const MES_NOMBRES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default async function ClienteDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const params = await searchParams;

  const periodos = await prisma.operacion.groupBy({
    by: ["anio", "mes"],
    _count: true,
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  const anio = parseInt(params.anio || String(periodos[0]?.anio || 2026));
  const mes = parseInt(params.mes || String(periodos[0]?.mes || 3));

  // All vigent clients
  const clientesVigentes = await prisma.empresa.findMany({
    where: { esCliente: true, vigencia: "SI" },
    select: { id: true, razonSocial: true },
    orderBy: { razonSocial: "asc" },
  });

  // Pedidos for period
  const pedidos = await prisma.pedidoCliente.findMany({
    where: { anio, mes },
    include: { empresa: { select: { id: true, razonSocial: true } } },
  });

  // Contacts
  const contactos = await prisma.contacto.findMany({
    where: { empresaId: { in: clientesVigentes.map((c) => c.id) } },
    orderBy: { nombre: "asc" },
  });
  const contactMap = new Map<number, string>();
  for (const c of contactos) {
    if (!contactMap.has(c.empresaId)) contactMap.set(c.empresaId, c.nombre);
  }
  for (const p of pedidos) {
    if (p.contacto && !contactMap.has(p.empresaId)) {
      contactMap.set(p.empresaId, p.contacto);
    }
  }

  // Build pedido map
  const pedidoMap = new Map<number, { importe: number; pedidoRestante: number; contacto: string }>();
  for (const p of pedidos) {
    pedidoMap.set(p.empresaId, {
      importe: Number(p.importe),
      pedidoRestante: Number(p.pedidoRestante),
      contacto: p.contacto || contactMap.get(p.empresaId) || "",
    });
  }

  // Ops grouped by client
  const opsGrouped = await prisma.operacion.groupBy({
    by: ["clienteId"],
    where: { anio, mes },
    _sum: { importe: true },
    _count: true,
  });
  const opsMap = new Map(opsGrouped.map((o) => [o.clienteId, { total: Number(o._sum.importe), count: o._count }]));

  // Classify
  type CliRow = { id: number; razonSocial: string; contacto: string; pedido: number; pedidoRestante: number; opsTotal: number; opsCount: number };

  const conPedido: CliRow[] = [];
  const noPidieron: CliRow[] = [];
  const noResponden: CliRow[] = [];

  for (const cli of clientesVigentes) {
    const pedData = pedidoMap.get(cli.id);
    const opsData = opsMap.get(cli.id);
    const contacto = pedData?.contacto || contactMap.get(cli.id) || "";

    const row: CliRow = {
      id: cli.id,
      razonSocial: cli.razonSocial,
      contacto,
      pedido: pedData?.importe || 0,
      pedidoRestante: pedData?.pedidoRestante || 0,
      opsTotal: opsData?.total || 0,
      opsCount: opsData?.count || 0,
    };

    if (pedData && pedData.importe > 0) {
      conPedido.push(row);
    } else if (pedData || opsData) {
      noPidieron.push(row);
    } else {
      noResponden.push(row);
    }
  }

  conPedido.sort((a, b) => b.pedido - a.pedido);
  noPidieron.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  noResponden.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));

  // Monthly totals
  const monthlyOps = await prisma.operacion.groupBy({
    by: ["anio", "mes"],
    _sum: { importe: true },
    orderBy: [{ anio: "asc" }, { mes: "asc" }],
  });

  return (
    <div>
      {/* Header with tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
          <Link href="/dashboard" className="hover:text-accent transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-foreground">Clientes</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Dashboard Clientes
            </h1>
            <p className="text-muted text-sm">
              {MES_NOMBRES[mes]} {anio} &middot; {clientesVigentes.length} vigentes
            </p>
          </div>
          <Link
            href="/dashboard/proveedores"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            Ver Proveedores
          </Link>
        </div>
      </div>

      {/* Filtro + KPIs */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="bg-card-bg rounded-xl border border-border-color p-3">
          <form className="flex items-center gap-3">
            <select name="anio" defaultValue={anio} className="bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-foreground">
              {Array.from(new Set(periodos.map((p) => p.anio))).sort((a, b) => b - a).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select name="mes" defaultValue={mes} className="bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-foreground">
              {periodos.filter((p) => p.anio === anio).map((p) => (
                <option key={p.mes} value={p.mes}>{MES_NOMBRES[p.mes]}</option>
              ))}
            </select>
            <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              Filtrar
            </button>
          </form>
        </div>
        <Kpi label="Con Pedido" value={conPedido.length.toString()} color="text-emerald-600" />
        <Kpi label="No Pidieron" value={noPidieron.length.toString()} color="text-amber-600" />
        <Kpi label="Sin Respuesta" value={noResponden.length.toString()} color="text-red-600" />
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Con Pedido */}
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="px-4 py-3 border-b border-border-color bg-emerald-500/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Con Pedido</h2>
              <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">{conPedido.length}</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card-bg">
                <tr className="text-muted border-b border-border-color">
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-2 py-2 text-left font-medium">Contacto</th>
                  <th className="px-2 py-2 text-right font-medium">Pedido</th>
                  <th className="px-3 py-2 text-right font-medium">Restante</th>
                </tr>
              </thead>
              <tbody>
                {conPedido.map((c) => (
                  <tr key={c.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/empresas/${c.id}`} className="text-foreground hover:text-accent font-medium">
                        {c.razonSocial}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-muted truncate max-w-[120px]">{c.contacto || "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-foreground">{formatCompact(c.pedido)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${c.pedidoRestante > 0 ? "text-amber-600" : c.pedidoRestante < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCompact(c.pedidoRestante)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Pidieron */}
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="px-4 py-3 border-b border-border-color bg-amber-500/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">No Pidieron</h2>
              <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">{noPidieron.length}</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card-bg">
                <tr className="text-muted border-b border-border-color">
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {noPidieron.map((c) => (
                  <tr key={c.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/empresas/${c.id}`} className="text-foreground hover:text-accent font-medium">
                        {c.razonSocial}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{c.contacto || "—"}</td>
                  </tr>
                ))}
                {noPidieron.length === 0 && (
                  <tr><td colSpan={2} className="px-3 py-6 text-center text-muted">Todos los clientes pidieron</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sin Respuesta */}
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="px-4 py-3 border-b border-border-color bg-red-500/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Sin Respuesta</h2>
              <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">{noResponden.length}</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card-bg">
                <tr className="text-muted border-b border-border-color">
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {noResponden.map((c) => (
                  <tr key={c.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/empresas/${c.id}`} className="text-foreground hover:text-accent font-medium">
                        {c.razonSocial}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{c.contacto || "—"}</td>
                  </tr>
                ))}
                {noResponden.length === 0 && (
                  <tr><td colSpan={2} className="px-3 py-6 text-center text-muted">Todos respondieron</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Totales por Mes */}
      <div className="mt-6 bg-card-bg rounded-xl border border-border-color p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Totales por Mes</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-2 h-2 rounded-sm bg-blue-500" />
            Enviado
          </div>
        </div>
        <DashboardChart
          color="#3b82f6"
          label="Enviado"
          data={monthlyOps.map((m) => ({
            label: `${MES_NOMBRES[m.mes]} ${String(m.anio).slice(2)}`,
            enviado: Number(m._sum.importe) || 0,
            active: m.anio === anio && m.mes === mes,
          }))}
        />
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card-bg rounded-xl border border-border-color px-4 py-3">
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatCompact(value: number): string {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
