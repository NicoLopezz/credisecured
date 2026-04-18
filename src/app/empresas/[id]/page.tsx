import { prisma } from "@/lib/prisma";
import { formatARS, formatCuit } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

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
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Ops como Cliente"
          value={totalOpsCliente.toString()}
          sub={formatARS(volCliente._sum.importe)}
        />
        <KpiCard
          label="Ops como Proveedor"
          value={totalOpsProveedor.toString()}
          sub={formatARS(volProveedor._sum.importe)}
        />
        <KpiCard
          label="Cupos"
          value={empresa.cuposProveedor.length.toString()}
          sub={
            empresa.cuposProveedor.length > 0
              ? `Ultimo: ${MES[empresa.cuposProveedor[0].mes]} ${empresa.cuposProveedor[0].anio}`
              : "Sin cupos"
          }
        />
        <KpiCard
          label="Pedidos"
          value={empresa.pedidosCliente.length.toString()}
          sub={
            empresa.pedidosCliente.length > 0
              ? `Ultimo: ${MES[empresa.pedidosCliente[0].mes]} ${empresa.pedidosCliente[0].anio}`
              : "Sin pedidos"
          }
        />
      </div>

      {/* 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* === COL IZQUIERDA: Datos + Contactos + Bancarios === */}
        <div className="space-y-6">
          <Section title="Datos Generales">
            <Field label="Comprobante" value={empresa.comprobante} />
            <Field label="Actividad Principal" value={empresa.actividadPrimaria} />
            <Field label="Actividad Secundaria" value={empresa.actividadSecundaria} />
            <Field label="Otras Actividades" value={empresa.otrasActividades} />
            <Field label="Rubro" value={empresa.rubro} />
            <Field label="Vigencia" value={empresa.vigencia} />
            {empresa.url && <Field label="URL" value={empresa.url} />}

            <div className="border-t border-border-color pt-3 mt-3">
              <p className="text-xs text-muted mb-2 font-medium">Costos</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
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
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mt-2">
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

            {empresa.observaciones && (
              <div className="border-t border-border-color pt-3 mt-3">
                <p className="text-xs text-muted mb-1">Observaciones</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {empresa.observaciones}
                </p>
              </div>
            )}
            {empresa.comentarios && (
              <div className="border-t border-border-color pt-3 mt-3">
                <p className="text-xs text-muted mb-1">Comentarios</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {empresa.comentarios}
                </p>
              </div>
            )}
          </Section>

          {/* Contactos */}
          <Section title="Contactos" count={empresa.contactos.length}>
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
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Datos Bancarios */}
          <Section title="Datos Bancarios" count={empresa.datosBancarios.length}>
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
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* === COL CENTRAL: Operaciones + Cupos + Pedidos + Matriz === */}
        <div className="space-y-6">
          {/* Operaciones como Cliente */}
          {empresa.esCliente && (
            <Section title="Operaciones como Cliente" count={totalOpsCliente}>
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
            <Section title="Operaciones como Proveedor" count={totalOpsProveedor}>
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

          {/* Cupos Proveedor */}
          {empresa.esProveedor && empresa.cuposProveedor.length > 0 && (
            <Section title="Cupos Proveedor" count={empresa.cuposProveedor.length}>
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
            <Section title="Pedidos Cliente" count={empresa.pedidosCliente.length}>
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

          {/* Matriz de Cupos */}
          {(empresa.matrizCliente.length > 0 ||
            empresa.matrizProveedor.length > 0) && (
            <Section title="Matriz de Cupos">
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

        {/* === COL DERECHA: Timeline + Documentos === */}
        <div className="space-y-6">
          {/* Timeline / Notas */}
          <Section title="Actividad" count={empresa.notas.length}>
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

          {/* Documentos */}
          <Section title="Documentos" count={empresa.documentos.length}>
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
      </div>
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
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
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
      {children}
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
