import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import DashboardChart from "@/components/DashboardChart";
import Link from "next/link";

const MES_NOMBRES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default async function ProveedorDashboardPage({
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

  // All vigent providers
  const proveedoresVigentes = await prisma.empresa.findMany({
    where: { esProveedor: true, vigencia: "SI" },
    select: { id: true, razonSocial: true },
    orderBy: { razonSocial: "asc" },
  });
  const vigentIds = new Set(proveedoresVigentes.map((p) => p.id));

  // Cupos for period
  const cupos = await prisma.cupoProveedor.findMany({
    where: { anio, mes },
    include: { empresa: { select: { id: true, razonSocial: true, vigencia: true } } },
  });

  // Contacts for providers
  const contactos = await prisma.contacto.findMany({
    where: { empresaId: { in: proveedoresVigentes.map((p) => p.id) } },
    orderBy: { nombre: "asc" },
  });
  const contactMap = new Map<number, string>();
  for (const c of contactos) {
    if (!contactMap.has(c.empresaId)) contactMap.set(c.empresaId, c.nombre);
  }
  // Also add from cupos
  for (const c of cupos) {
    if (c.contacto && !contactMap.has(c.empresaId)) {
      contactMap.set(c.empresaId, c.contacto);
    }
  }

  // Build cupo map
  const cupoMap = new Map<number, { importe: number; cupoRestante: number; contacto: string }>();
  for (const c of cupos) {
    cupoMap.set(c.empresaId, {
      importe: Number(c.importe),
      cupoRestante: Number(c.cupoRestante),
      contacto: c.contacto || contactMap.get(c.empresaId) || "",
    });
  }

  // Operations for the period grouped by provider
  const opsGrouped = await prisma.operacion.groupBy({
    by: ["proveedorId"],
    where: { anio, mes },
    _sum: { importe: true },
    _count: true,
  });
  const opsMap = new Map(opsGrouped.map((o) => [o.proveedorId, { total: Number(o._sum.importe), count: o._count }]));

  // Classify providers
  type ProvRow = { id: number; razonSocial: string; contacto: string; cupo: number; cupoRestante: number; opsTotal: number; opsCount: number };

  const conCupo: ProvRow[] = [];
  const sinCupo: ProvRow[] = [];
  const noResponden: ProvRow[] = [];

  for (const prov of proveedoresVigentes) {
    const cupoData = cupoMap.get(prov.id);
    const opsData = opsMap.get(prov.id);
    const contacto = cupoData?.contacto || contactMap.get(prov.id) || "";

    const row: ProvRow = {
      id: prov.id,
      razonSocial: prov.razonSocial,
      contacto,
      cupo: cupoData?.importe || 0,
      cupoRestante: cupoData?.cupoRestante || 0,
      opsTotal: opsData?.total || 0,
      opsCount: opsData?.count || 0,
    };

    if (cupoData && cupoData.importe > 0) {
      conCupo.push(row);
    } else if (cupoData || opsData) {
      // Has a record but cupo is 0 = sin cupo
      sinCupo.push(row);
    } else {
      // No cupo record, no operations = no responden
      noResponden.push(row);
    }
  }

  conCupo.sort((a, b) => b.cupo - a.cupo);
  sinCupo.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  noResponden.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));

  // Monthly totals for chart
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
          <span className="text-foreground">Proveedores</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Dashboard Proveedores
            </h1>
            <p className="text-muted text-sm">
              {MES_NOMBRES[mes]} {anio} &middot; {proveedoresVigentes.length} vigentes
            </p>
          </div>
          <Link
            href="/dashboard/clientes"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            Ver Clientes
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
        <Kpi label="Con Cupo" value={conCupo.length.toString()} color="text-emerald-600" />
        <Kpi label="Sin Cupo" value={sinCupo.length.toString()} color="text-amber-600" />
        <Kpi label="No Responden" value={noResponden.length.toString()} color="text-red-600" />
      </div>

      {/* 3 columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Con Cupo y Vigentes */}
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="px-4 py-3 border-b border-border-color bg-emerald-500/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Con Cupo y Vigentes</h2>
              <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">{conCupo.length}</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card-bg">
                <tr className="text-muted border-b border-border-color">
                  <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                  <th className="px-2 py-2 text-left font-medium">Contacto</th>
                  <th className="px-2 py-2 text-right font-medium">Cupo</th>
                  <th className="px-3 py-2 text-right font-medium">Restante</th>
                </tr>
              </thead>
              <tbody>
                {conCupo.map((p) => (
                  <tr key={p.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/empresas/${p.id}`} className="text-foreground hover:text-accent font-medium">
                        {p.razonSocial}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-muted truncate max-w-[120px]">{p.contacto || "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-foreground">{formatCompact(p.cupo)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${p.cupoRestante > 0 ? "text-emerald-600" : p.cupoRestante < 0 ? "text-red-600" : "text-muted"}`}>
                      {formatCompact(p.cupoRestante)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sin Cupo y Vigentes */}
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="px-4 py-3 border-b border-border-color bg-amber-500/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Sin Cupo y Vigentes</h2>
              <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">{sinCupo.length}</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card-bg">
                <tr className="text-muted border-b border-border-color">
                  <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-left font-medium">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {sinCupo.map((p) => (
                  <tr key={p.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/empresas/${p.id}`} className="text-foreground hover:text-accent font-medium">
                        {p.razonSocial}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{p.contacto || "—"}</td>
                  </tr>
                ))}
                {sinCupo.length === 0 && (
                  <tr><td colSpan={2} className="px-3 py-6 text-center text-muted">Sin proveedores en esta categoria</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Responden y Vigentes */}
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="px-4 py-3 border-b border-border-color bg-red-500/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">No Responden y Vigentes</h2>
              <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">{noResponden.length}</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card-bg">
                <tr className="text-muted border-b border-border-color">
                  <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-left font-medium">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {noResponden.map((p) => (
                  <tr key={p.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/empresas/${p.id}`} className="text-foreground hover:text-accent font-medium">
                        {p.razonSocial}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{p.contacto || "—"}</td>
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
            <span className="w-2 h-2 rounded-sm bg-emerald-500" />
            Enviado
          </div>
        </div>
        <DashboardChart
          color="#10b981"
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
