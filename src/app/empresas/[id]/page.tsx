import { prisma } from "@/lib/prisma";
import { formatARS, formatCuit } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmpresaTabs, { type TabItem } from "@/components/EmpresaTabs";

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = parseInt(id);
  if (isNaN(empresaId)) notFound();

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      contactos: { orderBy: { nombre: "asc" } },
      documentos: { orderBy: { createdAt: "desc" } },
      notas: { orderBy: { createdAt: "desc" }, take: 20 },
      datosBancarios: true,
      etiquetas: { include: { etiqueta: true } },
      operacionesCliente: {
        orderBy: { fecha: "desc" },
        take: 20,
        include: { proveedor: { select: { id: true, razonSocial: true } } },
      },
      operacionesProveedor: {
        orderBy: { fecha: "desc" },
        take: 20,
        include: { cliente: { select: { id: true, razonSocial: true } } },
      },
      cuposProveedor: { orderBy: [{ anio: "desc" }, { mes: "desc" }], take: 12 },
      pedidosCliente: { orderBy: [{ anio: "desc" }, { mes: "desc" }], take: 12 },
      matrizCliente: {
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
        take: 10,
        include: { proveedor: { select: { id: true, razonSocial: true } } },
      },
      matrizProveedor: {
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
        take: 10,
        include: { cliente: { select: { id: true, razonSocial: true } } },
      },
    },
  });

  if (!empresa) notFound();

  const [totalOpsCliente, totalOpsProveedor, volCliente, volProveedor] =
    await Promise.all([
      prisma.operacion.count({ where: { clienteId: empresaId } }),
      prisma.operacion.count({ where: { proveedorId: empresaId } }),
      prisma.operacion.aggregate({
        where: { clienteId: empresaId },
        _sum: { importe: true },
      }),
      prisma.operacion.aggregate({
        where: { proveedorId: empresaId },
        _sum: { importe: true },
      }),
    ]);

  const MES = [
    "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  const tipoNotas: Record<string, { label: string; color: string }> = {
    LLAMADA: { label: "Llamada", color: "bg-green-500/20 text-green-400" },
    EMAIL: { label: "Email", color: "bg-blue-500/20 text-blue-400" },
    REUNION: { label: "Reunion", color: "bg-purple-500/20 text-purple-400" },
    WHATSAPP: { label: "WhatsApp", color: "bg-emerald-500/20 text-emerald-400" },
    SEGUIMIENTO: { label: "Seguimiento", color: "bg-yellow-500/20 text-yellow-400" },
    INTERNO: { label: "Interno", color: "bg-gray-500/20 text-gray-400" },
  };

  const tiposDocs: Record<string, string> = {
    CONTRATO: "Contrato",
    CONSTANCIA_AFIP: "Constancia AFIP",
    FACTURA: "Factura",
    PODER: "Poder",
    ESTATUTO: "Estatuto",
    OTRO: "Otro",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/empresas"
          className="text-muted hover:text-accent text-sm mb-3 inline-block"
        >
          &larr; Volver a Empresas
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {empresa.razonSocial}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-muted">
                CUIT: {formatCuit(empresa.cuit)}
              </span>
              {empresa.esCliente && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                  Cliente
                </span>
              )}
              {empresa.esProveedor && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                  Proveedor
                </span>
              )}
              {empresa.estado === "ACTIVO" ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                  Activo
                </span>
              ) : empresa.estado === "INACTIVO" ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                  Inactivo
                </span>
              ) : null}
              {empresa.etiquetas.map((ee) => (
                <span
                  key={ee.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${ee.etiqueta.color}20`,
                    color: ee.etiqueta.color,
                  }}
                >
                  {ee.etiqueta.nombre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EmpresaTabs tabs={buildTabs()} />
    </div>
  );

  function buildInformacion() {
    if (!empresa) return null;
    return (
      <div className="space-y-6">
        <Section title="Datos Generales">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-3">
            <Field label="Comprobante" value={empresa.comprobante} />
            <Field label="Actividad Principal" value={empresa.actividadPrimaria} />
            <Field label="Actividad Secundaria" value={empresa.actividadSecundaria} />
            <Field label="Otras Actividades" value={empresa.otrasActividades} />
            <Field label="Rubro" value={empresa.rubro} />
            <Field label="Vigencia" value={empresa.vigencia} />
            {empresa.url && <Field label="URL" value={empresa.url} />}
          </div>

          <div className="border-t border-border-color pt-3 mt-4">
            <p className="text-xs text-muted mb-2 font-medium">Costos</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-muted text-xs">A: </span>
                <span className="text-foreground font-mono">
                  {empresa.costoA ? `${Number(empresa.costoA) * 100}%` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted text-xs">B: </span>
                <span className="text-foreground font-mono">
                  {empresa.costoB ? `${Number(empresa.costoB) * 100}%` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted text-xs">C: </span>
                <span className="text-foreground font-mono">
                  {empresa.costoC ? `${Number(empresa.costoC) * 100}%` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted text-xs">Percep: </span>
                <span className="text-foreground">{empresa.percepciones ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted text-xs">Reten: </span>
                <span className="text-foreground">{empresa.retenciones ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted text-xs">Adic: </span>
                <span className="text-foreground font-mono">
                  {empresa.costoAdicional ? `${Number(empresa.costoAdicional) * 100}%` : "—"}
                </span>
              </div>
            </div>
          </div>

          {(empresa.observaciones || empresa.comentarios) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border-color pt-3 mt-4">
              {empresa.observaciones && (
                <div>
                  <p className="text-xs text-muted mb-1">Observaciones</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {empresa.observaciones}
                  </p>
                </div>
              )}
              {empresa.comentarios && (
                <div>
                  <p className="text-xs text-muted mb-1">Comentarios</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {empresa.comentarios}
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="Contactos" count={empresa.contactos.length} scroll>
            {empresa.contactos.length === 0 ? (
              <p className="text-sm text-muted">Sin contactos registrados</p>
            ) : (
              <div className="space-y-3">
                {empresa.contactos.map((c) => (
                  <div key={c.id} className="border border-border-color rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-foreground font-medium">{c.nombre}</p>
                      {c.rol && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            c.rol.includes("CLIENTE")
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {c.rol.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {c.telefono && (
                      <p className="text-xs text-muted">Tel: {c.telefono}</p>
                    )}
                    {c.email && (
                      <p className="text-xs text-muted">Email: {c.email}</p>
                    )}
                    {c.whatsapp && (
                      <p className="text-xs text-muted">WA: {c.whatsapp}</p>
                    )}
                    {!c.telefono && !c.email && !c.whatsapp && (
                      <p className="text-xs text-muted italic">Sin datos de contacto</p>
                    )}
                    <UpdatedAtFoot date={c.updatedAt} />
                  </div>
                ))}
              </div>
            )}

          </Section>

          <Section title="Datos Bancarios" count={empresa.datosBancarios.length} scroll>
            {empresa.datosBancarios.length === 0 ? (
              <p className="text-sm text-muted">Sin datos bancarios</p>
            ) : (
              <div className="space-y-3">
                {empresa.datosBancarios.map((db) => (
                  <div
                    key={db.id}
                    className="border border-border-color rounded-lg p-3"
                  >
                    <p className="text-sm text-foreground font-medium">{db.banco}</p>
                    <p className="text-xs font-mono text-muted mt-1">
                      CBU: {db.cbu}
                    </p>
                    {db.alias && (
                      <p className="text-xs text-muted">Alias: {db.alias}</p>
                    )}
                    {db.titular && (
                      <p className="text-xs text-muted">Titular: {db.titular}</p>
                    )}
                    {db.tipo && (
                      <p className="text-xs text-muted">
                        {db.tipo.replace(/_/g, " ")}
                      </p>
                    )}
                    <UpdatedAtFoot date={db.updatedAt} />
                  </div>
                ))}
              </div>
            )}

          </Section>
        </div>
      </div>
    );
  }

  function buildTabs(): TabItem[] {
    if (!empresa) return [];
    const resumen = (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBlock
            label="Ops Cliente"
            value={totalOpsCliente.toString()}
            sub={formatARS(volCliente._sum.importe)}
            accent="blue"
          />
          <StatBlock
            label="Ops Proveedor"
            value={totalOpsProveedor.toString()}
            sub={formatARS(volProveedor._sum.importe)}
            accent="purple"
          />
          <StatBlock
            label="Cupos"
            value={empresa.cuposProveedor.length.toString()}
            sub={
              empresa.cuposProveedor.length > 0
                ? `${MES[empresa.cuposProveedor[0].mes]} ${empresa.cuposProveedor[0].anio}`
                : "—"
            }
            accent="amber"
          />
          <StatBlock
            label="Pedidos"
            value={empresa.pedidosCliente.length.toString()}
            sub={
              empresa.pedidosCliente.length > 0
                ? `${MES[empresa.pedidosCliente[0].mes]} ${empresa.pedidosCliente[0].anio}`
                : "—"
            }
            accent="emerald"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <SummaryItem label="Volumen total" value={formatARS(
            Number(volCliente._sum.importe ?? 0) +
              Number(volProveedor._sum.importe ?? 0)
          )} />
          <SummaryItem label="Contactos" value={empresa.contactos.length.toString()} />
          <SummaryItem label="Documentos" value={empresa.documentos.length.toString()} />
          <SummaryItem label="Notas" value={empresa.notas.length.toString()} />
        </div>
        {empresa.operacionesCliente.length + empresa.operacionesProveedor.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Últimas operaciones
            </h3>
            <div className="space-y-2">
              {[...empresa.operacionesCliente, ...empresa.operacionesProveedor]
                .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
                .slice(0, 5)
                .map((op) => {
                  const isClienteOp = "proveedor" in op;
                  const contraparte = isClienteOp
                    ? (op as typeof empresa.operacionesCliente[number]).proveedor
                    : (op as typeof empresa.operacionesProveedor[number]).cliente;
                  return (
                    <div
                      key={op.id}
                      className="flex items-center justify-between border border-border-color/60 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isClienteOp ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {isClienteOp ? "→ Prov" : "← Cli"}
                        </span>
                        <Link
                          href={`/empresas/${contraparte.id}`}
                          className="text-sm text-foreground hover:text-blue-400"
                        >
                          {contraparte.razonSocial}
                        </Link>
                        <span className="text-[10px] text-muted">
                          {MES[op.mes]} {op.anio}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-green-400">
                          {formatARS(op.importe)}
                        </span>
                        <StatusBadge status={op.status} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );

    const operaciones = (
      <div className="space-y-6">
          {/* Operaciones como Cliente */}
          {empresa.esCliente && (
            <Section title="Operaciones como Cliente" count={totalOpsCliente} scroll>
              {empresa.operacionesCliente.length === 0 ? (
                <p className="text-sm text-muted">Sin operaciones</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted border-b border-border-color">
                        <th className="pb-2 text-left font-medium">Proveedor</th>
                        <th className="pb-2 text-right font-medium">Importe</th>
                        <th className="pb-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresa.operacionesCliente.map((op) => (
                        <tr
                          key={op.id}
                          className="border-b border-border-color/30"
                        >
                          <td className="py-2">
                            <Link
                              href={`/empresas/${op.proveedor.id}`}
                              className="text-foreground hover:text-accent"
                            >
                              {op.proveedor.razonSocial}
                            </Link>
                            <p className="text-muted">
                              {MES[op.mes]} {op.anio}
                            </p>
                          </td>
                          <td className="py-2 text-right font-mono text-green-400">
                            {formatARS(op.importe)}
                          </td>
                          <td className="py-2 text-center">
                            <StatusBadge status={op.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* Operaciones como Proveedor */}
          {empresa.esProveedor && (
            <Section title="Operaciones como Proveedor" count={totalOpsProveedor} scroll>
              {empresa.operacionesProveedor.length === 0 ? (
                <p className="text-sm text-muted">Sin operaciones</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted border-b border-border-color">
                        <th className="pb-2 text-left font-medium">Cliente</th>
                        <th className="pb-2 text-right font-medium">Importe</th>
                        <th className="pb-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresa.operacionesProveedor.map((op) => (
                        <tr
                          key={op.id}
                          className="border-b border-border-color/30"
                        >
                          <td className="py-2">
                            <Link
                              href={`/empresas/${op.cliente.id}`}
                              className="text-foreground hover:text-accent"
                            >
                              {op.cliente.razonSocial}
                            </Link>
                            <p className="text-muted">
                              {MES[op.mes]} {op.anio}
                            </p>
                          </td>
                          <td className="py-2 text-right font-mono text-green-400">
                            {formatARS(op.importe)}
                          </td>
                          <td className="py-2 text-center">
                            <StatusBadge status={op.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

      </div>
    );

    const cuposPedidos = (
      <div className="space-y-6">
          {/* Cupos Proveedor */}
          {empresa.esProveedor && empresa.cuposProveedor.length > 0 && (
            <Section title="Cupos Proveedor" count={empresa.cuposProveedor.length} scroll>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-border-color">
                    <th className="pb-2 text-left font-medium">Periodo</th>
                    <th className="pb-2 text-right font-medium">Importe</th>
                    <th className="pb-2 text-right font-medium">Restante</th>
                    <th className="pb-2 text-right font-medium">Enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {empresa.cuposProveedor.map((c) => (
                    <tr key={c.id} className="border-b border-border-color/30">
                      <td className="py-2 text-foreground">
                        {MES[c.mes]} {c.anio}
                      </td>
                      <td className="py-2 text-right font-mono text-foreground">
                        {formatARS(c.importe)}
                      </td>
                      <td className="py-2 text-right font-mono text-yellow-400">
                        {formatARS(c.cupoRestante)}
                      </td>
                      <td className="py-2 text-right font-mono text-green-400">
                        {formatARS(c.cupoEnviado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Pedidos Cliente */}
          {empresa.esCliente && empresa.pedidosCliente.length > 0 && (
            <Section title="Pedidos Cliente" count={empresa.pedidosCliente.length} scroll>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-border-color">
                    <th className="pb-2 text-left font-medium">Periodo</th>
                    <th className="pb-2 text-right font-medium">Importe</th>
                    <th className="pb-2 text-right font-medium">Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {empresa.pedidosCliente.map((p) => (
                    <tr key={p.id} className="border-b border-border-color/30">
                      <td className="py-2 text-foreground">
                        {MES[p.mes]} {p.anio}
                      </td>
                      <td className="py-2 text-right font-mono text-foreground">
                        {formatARS(p.importe)}
                      </td>
                      <td className="py-2 text-right font-mono text-yellow-400">
                        {formatARS(p.pedidoRestante)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

      </div>
    );

    const matriz = (
      <div className="space-y-6">
          {(empresa.matrizCliente.length > 0 ||
            empresa.matrizProveedor.length > 0) && (
            <Section title="Matriz de Cupos" scroll>
              {empresa.matrizCliente.length > 0 && (
                <>
                  <p className="text-xs text-muted mb-2 font-medium">
                    Como cliente:
                  </p>
                  <table className="w-full text-xs mb-4">
                    <thead>
                      <tr className="text-muted border-b border-border-color">
                        <th className="pb-2 text-left font-medium">Proveedor</th>
                        <th className="pb-2 text-right font-medium">Tasa</th>
                        <th className="pb-2 text-right font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresa.matrizCliente.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-border-color/30"
                        >
                          <td className="py-2">
                            <Link
                              href={`/empresas/${m.proveedor.id}`}
                              className="text-foreground hover:text-accent"
                            >
                              {m.proveedor.razonSocial}
                            </Link>
                            <p className="text-muted">
                              {MES[m.mes]} {m.anio}
                            </p>
                          </td>
                          <td className="py-2 text-right font-mono text-foreground">
                            {m.tasa?.toString() || "—"}%
                          </td>
                          <td className="py-2 text-right font-mono text-green-400">
                            {formatARS(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {empresa.matrizProveedor.length > 0 && (
                <>
                  <p className="text-xs text-muted mb-2 font-medium">
                    Como proveedor:
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted border-b border-border-color">
                        <th className="pb-2 text-left font-medium">Cliente</th>
                        <th className="pb-2 text-right font-medium">Tasa</th>
                        <th className="pb-2 text-right font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresa.matrizProveedor.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-border-color/30"
                        >
                          <td className="py-2">
                            <Link
                              href={`/empresas/${m.cliente.id}`}
                              className="text-foreground hover:text-accent"
                            >
                              {m.cliente.razonSocial}
                            </Link>
                            <p className="text-muted">
                              {MES[m.mes]} {m.anio}
                            </p>
                          </td>
                          <td className="py-2 text-right font-mono text-foreground">
                            {m.tasa?.toString() || "—"}%
                          </td>
                          <td className="py-2 text-right font-mono text-green-400">
                            {formatARS(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </Section>
          )}
      </div>
    );

    const actividad = (
      <div className="space-y-6">
          <Section title="Actividad" count={empresa.notas.length} scroll>
            {empresa.notas.length === 0 ? (
              <p className="text-sm text-muted">
                Sin actividad registrada. Las notas de llamadas, emails y
                seguimientos aparecen aqui.
              </p>
            ) : (
              <div className="space-y-3">
                {empresa.notas.map((nota) => {
                  const tipo = tipoNotas[nota.tipo] || {
                    label: nota.tipo,
                    color: "bg-gray-500/20 text-gray-400",
                  };
                  return (
                    <div
                      key={nota.id}
                      className="border-l-2 border-border-color pl-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tipo.color}`}
                        >
                          {tipo.label}
                        </span>
                        <span className="text-[10px] text-muted">
                          {nota.createdAt.toLocaleDateString("es-AR")}
                        </span>
                        {nota.usuario && (
                          <span className="text-[10px] text-muted">
                            por {nota.usuario}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">
                        {nota.texto}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

      </div>
    );

    const documentos = (
      <div className="space-y-6">
          <Section title="Documentos" count={empresa.documentos.length} scroll>
            {empresa.documentos.length === 0 ? (
              <p className="text-sm text-muted">
                Sin documentos adjuntos. Contratos, constancias AFIP, facturas y
                otros archivos aparecen aqui.
              </p>
            ) : (
              <div className="space-y-2">
                {empresa.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 border border-border-color rounded-lg"
                  >
                    <DocIcon mime={doc.mime} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate">{doc.nombre}</p>
                      <p className="text-[10px] text-muted">
                        {tiposDocs[doc.tipo] || doc.tipo} &middot;{" "}
                        {doc.createdAt.toLocaleDateString("es-AR")}
                        {doc.size ? ` · ${(doc.size / 1024).toFixed(0)} KB` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
      </div>
    );

    const tabs: TabItem[] = [
      { key: "info", label: "Información", content: buildInformacion() },
      { key: "resumen", label: "Resumen", content: resumen },
    ];
    if (empresa.esCliente || empresa.esProveedor) {
      tabs.push({
        key: "operaciones",
        label: "Operaciones",
        count: totalOpsCliente + totalOpsProveedor,
        content: operaciones,
      });
    }
    tabs.push({
      key: "cupos-pedidos",
      label: "Cupos y Pedidos",
      count: empresa.cuposProveedor.length + empresa.pedidosCliente.length,
      content: cuposPedidos,
    });
    if (empresa.matrizCliente.length + empresa.matrizProveedor.length > 0) {
      tabs.push({
        key: "matriz",
        label: "Matriz",
        count: empresa.matrizCliente.length + empresa.matrizProveedor.length,
        content: matriz,
      });
    }
    tabs.push({
      key: "actividad",
      label: "Actividad",
      count: empresa.notas.length,
      content: actividad,
    });
    tabs.push({
      key: "documentos",
      label: "Documentos",
      count: empresa.documentos.length,
      content: documentos,
    });
    return tabs;
  }
}

function UpdatedAtFoot({ date }: { date: Date }) {
  const dias = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const color =
    dias < 15 ? "text-green-400" : dias < 45 ? "text-amber-400" : "text-red-400";
  const label = dias === 0 ? "hoy" : `hace ${dias}d`;
  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-color/40 text-[10px] text-muted">
      <span>
        Actualizado{" "}
        {date.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })}
      </span>
      <span className={`font-mono ${color}`}>{label}</span>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/40 border border-border-color/60 rounded-lg px-3 py-2">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-mono text-foreground truncate">{value}</p>
    </div>
  );
}

/* ── Helper Components ── */

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-card-bg rounded-xl border border-border-color p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}

function Section({
  title,
  count,
  children,
  scroll,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <div className="bg-card-bg rounded-xl border border-border-color p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-muted bg-background/50 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {scroll ? (
        <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function SubTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border-color mt-5 pt-4 mb-3 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
        {children}
      </h3>
      {count !== undefined && (
        <span className="text-[10px] text-muted bg-background/50 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "blue" | "purple" | "amber" | "emerald";
}) {
  const accents: Record<string, string> = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  };
  return (
    <div className="bg-background/40 rounded-lg border border-border-color/60 p-3">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${accents[accent]}`}>{value}</p>
      <p className="text-[10px] text-muted mt-0.5 font-mono truncate">{sub}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="mb-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Enviado: "bg-blue-500/20 text-blue-400",
    Pendiente: "bg-yellow-500/20 text-yellow-400",
    Ubicado: "bg-green-500/20 text-green-400",
    Completado: "bg-green-500/20 text-green-400",
  };
  const color = colors[status] || "bg-gray-500/20 text-gray-400";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {status}
    </span>
  );
}

function DocIcon({ mime }: { mime: string | null }) {
  const isPdf = mime?.includes("pdf");
  const isImage = mime?.includes("image");
  const isExcel = mime?.includes("sheet") || mime?.includes("excel");
  const isWord = mime?.includes("word") || mime?.includes("document");

  const color = isPdf
    ? "text-red-400"
    : isImage
    ? "text-purple-400"
    : isExcel
    ? "text-green-400"
    : isWord
    ? "text-blue-400"
    : "text-muted";

  return (
    <svg
      className={`w-5 h-5 flex-shrink-0 ${color}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}
