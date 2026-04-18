import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import { MatrizCell } from "@/components/MatrizCell";
import Link from "next/link";
import ContactAvatar from "@/components/ContactAvatar";
import HoverTip from "@/components/HoverTip";

const MES_NOMBRES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function MatrizPage({
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

  const [operaciones, cupos, pedidos] = await Promise.all([
    prisma.operacion.findMany({
      where: { anio, mes },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        proveedor: { select: { id: true, razonSocial: true } },
      },
    }),
    prisma.cupoProveedor.findMany({
      where: { anio, mes },
      include: { empresa: { select: { id: true, razonSocial: true } } },
    }),
    prisma.pedidoCliente.findMany({
      where: { anio, mes },
      include: { empresa: { select: { id: true, razonSocial: true } } },
    }),
  ]);

  // --- Fetch contacts for all involved companies ---
  const allEmpresaIds = new Set<number>();
  for (const c of cupos) allEmpresaIds.add(c.empresaId);
  for (const p of pedidos) allEmpresaIds.add(p.empresaId);
  for (const op of operaciones) { allEmpresaIds.add(op.clienteId); allEmpresaIds.add(op.proveedorId); }
  const contactos = await prisma.contacto.findMany({
    where: { empresaId: { in: Array.from(allEmpresaIds) } },
    select: { nombre: true, email: true, telefono: true, whatsapp: true, rol: true, empresaId: true },
  });
  const contactosByName = new Map<string, { nombre: string; email: string | null; telefono: string | null; whatsapp: string | null; empresaId: number }>();
  for (const c of contactos) {
    contactosByName.set(`${c.empresaId}-${c.nombre}`, c);
  }

  // --- Build provider data ---
  const provMap = new Map<number, {
    id: number; razonSocial: string; cupo: number;
    cupoRestante: number; cupoEnviado: number; contacto: string;
  }>();
  for (const c of cupos) {
    provMap.set(c.empresaId, {
      id: c.empresaId, razonSocial: c.empresa.razonSocial,
      cupo: Number(c.importe), cupoRestante: Number(c.cupoRestante),
      cupoEnviado: Number(c.cupoEnviado), contacto: c.contacto || "",
    });
  }
  for (const op of operaciones) {
    if (!provMap.has(op.proveedorId)) {
      provMap.set(op.proveedorId, {
        id: op.proveedorId, razonSocial: op.proveedor.razonSocial,
        cupo: 0, cupoRestante: 0, cupoEnviado: 0,
        contacto: op.proveedorContacto || "",
      });
    }
  }

  // --- Build client data ---
  const clientMap = new Map<number, {
    id: number; razonSocial: string; pedido: number;
    pedidoRestante: number; contacto: string;
  }>();
  for (const p of pedidos) {
    clientMap.set(p.empresaId, {
      id: p.empresaId, razonSocial: p.empresa.razonSocial,
      pedido: Number(p.importe), pedidoRestante: Number(p.pedidoRestante),
      contacto: p.contacto || "",
    });
  }
  for (const op of operaciones) {
    if (!clientMap.has(op.clienteId)) {
      clientMap.set(op.clienteId, {
        id: op.clienteId, razonSocial: op.cliente.razonSocial,
        pedido: 0, pedidoRestante: 0, contacto: op.clienteContacto || "",
      });
    }
  }

  // --- Build cross matrix ---
  const matrix = new Map<number, Map<number, { total: number; status: string; count: number }>>();
  for (const op of operaciones) {
    if (!matrix.has(op.clienteId)) matrix.set(op.clienteId, new Map());
    const row = matrix.get(op.clienteId)!;
    const existing = row.get(op.proveedorId);
    if (existing) {
      existing.total += Number(op.importe);
      existing.count += 1;
      if (op.status === "Pendiente") existing.status = "Pendiente";
    } else {
      row.set(op.proveedorId, { total: Number(op.importe), status: op.status, count: 1 });
    }
  }

  // --- Totals ---
  const provTotals = new Map<number, number>();
  for (const [, row] of matrix) {
    for (const [provId, cell] of row) {
      provTotals.set(provId, (provTotals.get(provId) || 0) + cell.total);
    }
  }
  const clientTotals = new Map<number, number>();
  for (const [clientId, row] of matrix) {
    let t = 0;
    for (const [, cell] of row) t += cell.total;
    clientTotals.set(clientId, t);
  }

  const proveedores = Array.from(provMap.values()).sort((a, b) => b.cupo - a.cupo || b.cupoEnviado - a.cupoEnviado);
  const clientes = Array.from(clientMap.values()).sort((a, b) => b.pedido - a.pedido);

  const provResta = new Map<number, number>();
  for (const prov of proveedores) {
    provResta.set(prov.id, prov.cupo - (provTotals.get(prov.id) || 0));
  }

  const totalOps = operaciones.length;
  const totalVolumen = operaciones.reduce((s, o) => s + Number(o.importe), 0);
  const opsPendientes = operaciones.filter((o) => o.status === "Pendiente").length;

  // Sticky widths
  const W_CLI = 200;
  const W_CONT = 48;
  const W_PED = 90;
  const W_RESTA = 90;
  const LEFT_CONT = W_CLI;
  const LEFT_PED = W_CLI + W_CONT;
  const LEFT_RESTA = W_CLI + W_CONT + W_PED;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Matriz de Cruce
          </h1>
          <p className="text-muted text-sm">
            {MES_NOMBRES[mes]} {anio} &middot; {clientes.length} clientes &middot;{" "}
            {proveedores.length} proveedores &middot; {totalOps} operaciones
          </p>
        </div>
      </div>

      {/* Filtros + KPIs */}
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
        <MiniKpi label="Volumen" value={formatARS(totalVolumen)} info="Suma total de importes de todas las operaciones del periodo" />
        <MiniKpi label="Operaciones" value={totalOps.toString()} info="Cantidad de operaciones (cruces cliente-proveedor) en el periodo" />
        <MiniKpi label="Pendientes" value={opsPendientes.toString()} accent={opsPendientes > 0} info="Operaciones con status Pendiente, aun no enviadas" />
        <div className="flex items-center gap-3 text-[11px] text-muted ml-auto">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500/15 border border-blue-500/30" />Enviado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/15 border border-amber-500/30" />Pendiente</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500/15 border border-green-500/30" />Ubicado</span>
          <span className="flex items-center gap-1.5"><span className="font-medium">SC</span> Sin Cupo</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="text-[11px] border-collapse w-max">
            <thead className="sticky top-0 z-30">
              {/* Row 1: "Proveedores" label + legend | Proveedor names */}
              <tr className="border-b border-border-color">
                <th colSpan={4} className="sticky left-0 z-40 bg-sidebar-bg px-3 py-2 text-right" style={{ minWidth: W_CLI + W_CONT + W_PED + W_RESTA }}>
                  <span className="text-[11px] text-foreground font-bold uppercase tracking-wider">Proveedores</span>
                </th>
                {proveedores.map((prov) => (
                  <th key={`n-${prov.id}`} className="px-2 py-1.5 border-l border-border-color bg-sidebar-bg min-w-[110px] max-w-[130px] text-center">
                    <Link href={`/empresas/${prov.id}`} className="text-foreground hover:text-accent font-bold block truncate" title={prov.razonSocial}>
                      {prov.razonSocial}
                    </Link>
                  </th>
                ))}
              </tr>

              {/* Row 2: Proveedor Contacto */}
              <tr className="border-b border-border-color">
                <th colSpan={4} className="sticky left-0 z-40 bg-sidebar-bg px-3 py-1 text-right">
                  <InfoLabel label="Contacto" info="Contacto comercial asignado al proveedor para este periodo" />
                </th>
                {proveedores.map((prov) => {
                  const ci = contactosByName.get(`${prov.id}-${prov.contacto}`);
                  return (
                    <th key={`c-${prov.id}`} className="px-2 py-1 border-l border-border-color bg-sidebar-bg font-normal text-center">
                      <ContactAvatar
                        name={prov.contacto}
                        size="xs"
                        contact={ci ? { ...ci, nombre: ci.nombre, empresaId: prov.id } : prov.contacto ? { nombre: prov.contacto, empresaId: prov.id } : null}
                      />
                    </th>
                  );
                })}
              </tr>

              {/* Row 3: Proveedor Cupo */}
              <tr className="border-b border-border-color">
                <th colSpan={4} className="sticky left-0 z-40 bg-sidebar-bg px-3 py-1 text-right">
                  <InfoLabel label="Cupo" info="Monto maximo que el proveedor puede facturar en el periodo. SC = Sin Cupo asignado." />
                </th>
                {proveedores.map((prov) => (
                  <th key={`q-${prov.id}`} className="px-2 py-1 border-l border-border-color bg-sidebar-bg font-mono font-normal text-foreground text-center">
                    {prov.cupo > 0 ? formatCompact(prov.cupo) : <span className="text-muted">SC</span>}
                  </th>
                ))}
              </tr>

              {/* Row 4: Proveedor Resta */}
              <tr className="border-b border-border-color">
                <th colSpan={4} className="sticky left-0 z-40 bg-sidebar-bg px-3 py-1 text-right">
                  <InfoLabel label="Resta" info="Cupo del proveedor menos la suma de operaciones asignadas. Verde = disponible. Rojo = excedido." />
                </th>
                {proveedores.map((prov) => {
                  const r = provResta.get(prov.id) || 0;
                  return (
                    <th key={`r-${prov.id}`} className={`px-2 py-1 border-l border-border-color bg-sidebar-bg font-mono font-normal text-center ${r > 0 ? "text-emerald-600" : r < 0 ? "text-red-600" : "text-muted"}`}>
                      {formatCompact(r)}
                    </th>
                  );
                })}
              </tr>

              {/* Row 5: Client column headers */}
              <tr className="border-b-2 border-border-color bg-sidebar-bg">
                <th className="sticky left-0 z-40 bg-sidebar-bg px-3 py-2 text-left text-foreground font-bold text-[11px] uppercase tracking-wider" style={{ width: W_CLI, minWidth: W_CLI }}>
                  Clientes
                </th>
                <th className={`sticky z-40 bg-sidebar-bg px-1 py-2 text-center text-muted font-medium`} style={{ left: W_CLI, width: W_CONT, minWidth: W_CONT }}>
                  Contacto
                </th>
                <th className={`sticky z-40 bg-sidebar-bg px-2 py-2 text-center font-medium`} style={{ left: LEFT_PED, width: W_PED, minWidth: W_PED }}>
                  <InfoLabel label="Pedido" info="Monto total que el cliente solicito operar en el periodo" right />
                </th>
                <th className={`sticky z-40 bg-sidebar-bg px-2 py-2 text-center font-medium`} style={{ left: LEFT_RESTA, width: W_RESTA, minWidth: W_RESTA }}>
                  <InfoLabel label="Resta" info="Pedido del cliente menos la suma de operaciones asignadas. Verde = cubierto. Amarillo = pendiente de cubrir." right />
                </th>
                {proveedores.map((prov) => (
                  <th key={`e-${prov.id}`} className="border-l border-border-color bg-sidebar-bg" />
                ))}
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => {
                const row = matrix.get(cliente.id);
                const totalAsignado = clientTotals.get(cliente.id) || 0;
                const resta = cliente.pedido - totalAsignado;
                const hasOps = row && row.size > 0;

                return (
                  <tr key={cliente.id} className="border-b border-border-color/30 hover:bg-card-bg-hover/50">
                    {/* Client name */}
                    <td className="sticky left-0 z-10 bg-card-bg px-3 py-1.5" style={{ width: W_CLI, minWidth: W_CLI }}>
                      <Link href={`/empresas/${cliente.id}`} className="text-foreground hover:text-accent font-bold truncate block" title={cliente.razonSocial} style={{ maxWidth: W_CLI - 24 }}>
                        {cliente.razonSocial}
                      </Link>
                    </td>

                    {/* Contacto */}
                    <td className="sticky z-10 bg-card-bg px-1 py-1.5 text-center" style={{ left: W_CLI, width: W_CONT, minWidth: W_CONT, maxWidth: W_CONT }}>
                      {(() => {
                        const ci = contactosByName.get(`${cliente.id}-${cliente.contacto}`);
                        return (
                          <ContactAvatar
                            name={cliente.contacto}
                            size="sm"
                            contact={ci ? { ...ci, nombre: ci.nombre, empresaId: cliente.id } : cliente.contacto ? { nombre: cliente.contacto, empresaId: cliente.id } : null}
                          />
                        );
                      })()}
                    </td>

                    {/* Pedido */}
                    <td className="sticky z-10 bg-card-bg px-2 py-1.5 text-center font-mono text-foreground" style={{ left: LEFT_PED, width: W_PED, minWidth: W_PED }}>
                      {cliente.pedido > 0 ? formatCompact(cliente.pedido) : "—"}
                    </td>

                    {/* Resta */}
                    <td className={`sticky z-10 bg-card-bg px-2 py-1.5 text-center font-mono font-medium ${resta > 0 ? "text-amber-600" : resta < 0 ? "text-red-600" : "text-emerald-600"}`} style={{ left: LEFT_RESTA, width: W_RESTA, minWidth: W_RESTA }}>
                      {cliente.pedido > 0 || totalAsignado > 0 ? formatCompact(resta) : "—"}
                    </td>

                    {/* Cross cells */}
                    {proveedores.map((prov) => {
                      const cell = row?.get(prov.id);
                      if (!cell) {
                        return (
                          <td key={`${cliente.id}-${prov.id}`} className="px-1 py-1.5 border-l border-border-color/10 text-center">
                          </td>
                        );
                      }

                      const isPending = cell.status === "Pendiente";
                      const isUbicado = cell.status === "Ubicado";
                      const colorClass = isPending
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25"
                        : isUbicado
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/25"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20";

                      return (
                        <td key={`${cliente.id}-${prov.id}`} className="px-0.5 py-0.5 border-l border-border-color/10">
                          <MatrizCell
                            monto={formatCompact(cell.total)}
                            montoFull={formatARS(cell.total)}
                            cliente={cliente.razonSocial}
                            proveedor={prov.razonSocial}
                            status={cell.status}
                            count={cell.count}
                            colorClass={colorClass}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

/* ── Helpers ── */

function formatCompact(value: number): string {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function InfoLabel({ label, info, right }: { label: string; info: string; right?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-muted text-[10px] font-medium ${right ? "justify-end w-full" : ""}`}>
      {label}
      <HoverTip text={info} />
    </span>
  );
}

function MiniKpi({ label, value, accent, info }: { label: string; value: string; accent?: boolean; info: string }) {
  return (
    <div className="bg-card-bg rounded-xl border border-border-color px-4 py-3">
      <div className="flex items-center gap-1">
        <p className="text-[10px] text-muted">{label}</p>
        <HoverTip text={info} size="xs" />
      </div>
      <p className={`text-lg font-bold ${accent ? "text-amber-500" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
