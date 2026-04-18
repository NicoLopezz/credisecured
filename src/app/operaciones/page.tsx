import { prisma } from "@/lib/prisma";
import { formatARS, formatCuit } from "@/lib/format";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import ColumnFilter from "@/components/ColumnFilter";
import ClearFilters from "@/components/ClearFilters";
import PeriodFilter from "@/components/PeriodFilter";

const MESES_OPTS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2025, i).toLocaleString("es-AR", { month: "long" }),
}));

export default async function OperacionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");
  const pageSize = 30;
  const sortCol = params.sort || "";
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const fCliente = params.f_cliente || "";
  const fProveedor = params.f_proveedor || "";
  const fStatus = params.f_status || "";
  const fContacto = params.f_contacto || "";

  // Available periods
  const periodos = await prisma.operacion.groupBy({
    by: ["anio", "mes"],
    _count: true,
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  const anio = parseInt(params.anio || String(periodos[0]?.anio || 2026));
  const mes = parseInt(params.mes || String(periodos[0]?.mes || 3));

  const where: any = { AND: [{ anio }, { mes }] };

  if (query) {
    where.AND.push({
      OR: [
        { cliente: { razonSocial: { contains: query, mode: "insensitive" } } },
        { proveedor: { razonSocial: { contains: query, mode: "insensitive" } } },
      ],
    });
  }
  if (fCliente) {
    const vals = fCliente.split("||");
    if (vals.length > 1) {
      where.AND.push({ cliente: { razonSocial: { in: vals } } });
    } else {
      where.AND.push({ cliente: { razonSocial: { contains: fCliente, mode: "insensitive" } } });
    }
  }
  if (fProveedor) {
    const vals = fProveedor.split("||");
    if (vals.length > 1) {
      where.AND.push({ proveedor: { razonSocial: { in: vals } } });
    } else {
      where.AND.push({ proveedor: { razonSocial: { contains: fProveedor, mode: "insensitive" } } });
    }
  }
  if (fStatus) {
    const vals = fStatus.split("||");
    if (vals.length > 1) {
      where.AND.push({ status: { in: vals } });
    } else {
      where.AND.push({ status: fStatus });
    }
  }
  if (fContacto) {
    where.AND.push({
      OR: [
        { clienteContacto: { contains: fContacto, mode: "insensitive" } },
        { proveedorContacto: { contains: fContacto, mode: "insensitive" } },
      ],
    });
  }

  if (where.AND.length === 0) delete where.AND;

  const validSortCols: Record<string, any> = {
    fecha: { fecha: sortDir },
    cliente: { cliente: { razonSocial: sortDir } },
    proveedor: { proveedor: { razonSocial: sortDir } },
    importe: { importe: sortDir },
    status: { status: sortDir },
  };
  const orderBy = validSortCols[sortCol] || { fecha: "desc" };

  const [operaciones, total, aggregate, years] = await Promise.all([
    prisma.operacion.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        cliente: { select: { id: true, razonSocial: true, cuit: true } },
        proveedor: { select: { id: true, razonSocial: true, cuit: true } },
      },
    }),
    prisma.operacion.count({ where }),
    prisma.operacion.aggregate({ where, _sum: { importe: true } }),
    prisma.operacion.findMany({
      distinct: ["anio"],
      select: { anio: true },
      orderBy: { anio: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const paginationParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") paginationParams.set(k, v);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Pedidos</h1>
          <p className="text-muted text-sm">
            {total} pedidos &middot; Volumen: {formatARS(aggregate._sum.importe)}
          </p>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <PeriodFilter periodos={periodos.map((p) => ({ anio: p.anio, mes: p.mes }))} anio={anio} mes={mes} />
          <div className="max-w-xs w-full">
            <SearchInput placeholder="Buscar cliente o proveedor..." />
          </div>
          <ClearFilters />
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-muted text-left border-b border-border-color bg-sidebar-bg">
                <th className="px-3 py-3 font-medium">
                  <ColumnFilter column="fecha" label="Fecha" />
                </th>
                <th className="px-3 py-3 font-medium text-xs">CUIT Cliente</th>
                <th className="px-3 py-3 font-medium">
                  <ColumnFilter column="cliente" label="Cliente" table="operacion" />
                </th>
                <th className="px-3 py-3 font-medium text-xs">CUIT Proveedor</th>
                <th className="px-3 py-3 font-medium">
                  <ColumnFilter column="proveedor" label="Proveedor" table="operacion" />
                </th>
                <th className="px-3 py-3 font-medium text-right">
                  <ColumnFilter column="importe" label="Importe" />
                </th>
                <th className="px-3 py-3 font-medium">
                  <ColumnFilter column="status" label="Status" table="operacion" />
                </th>
                <th className="px-3 py-3 font-medium text-xs">Comentario</th>
                <th className="px-3 py-3 font-medium text-xs">Cliente Enviado</th>
                <th className="px-3 py-3 font-medium text-xs">Proveedor Recibido</th>
                <th className="px-3 py-3 font-medium text-xs">Fecha Armado</th>
                <th className="px-3 py-3 font-medium text-xs">Contacto Cliente</th>
                <th className="px-3 py-3 font-medium text-xs">Contacto Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {operaciones.map((op) => (
                <tr key={op.id} className="hover:bg-sidebar-hover/30 transition-colors">
                  <td className="px-3 py-3 text-muted text-xs font-mono whitespace-nowrap">
                    {new Date(op.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-3 py-3 text-muted text-xs font-mono whitespace-nowrap">
                    {formatCuit(op.cliente.cuit)}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/empresas/${op.cliente.id}`} className="text-foreground hover:text-accent transition-colors">
                      {op.cliente.razonSocial}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted text-xs font-mono whitespace-nowrap">
                    {formatCuit(op.proveedor.cuit)}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/empresas/${op.proveedor.id}`} className="text-foreground hover:text-accent transition-colors">
                      {op.proveedor.razonSocial}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-green-400 whitespace-nowrap">
                    {formatARS(op.importe)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      op.status === "Enviado"
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        : op.status === "Ubicado"
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted text-xs max-w-[180px] truncate" title={op.comentario || ""}>
                    {op.comentario || "\u2014"}
                  </td>
                  <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">
                    {op.clienteEnviado || "\u2014"}
                  </td>
                  <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">
                    {op.proveedorRecibido || "\u2014"}
                  </td>
                  <td className="px-3 py-3 text-muted text-xs font-mono whitespace-nowrap">
                    {op.fechaArmado ? new Date(op.fechaArmado).toLocaleDateString("es-AR") : "\u2014"}
                  </td>
                  <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">
                    {op.clienteContacto || "\u2014"}
                  </td>
                  <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">
                    {op.proveedorContacto || "\u2014"}
                  </td>
                </tr>
              ))}
              {operaciones.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-muted">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-color">
            <p className="text-xs text-muted">
              Pagina {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/operaciones?${paginationParams.toString()}&page=${page - 1}`}
                  className="px-3 py-1 text-xs bg-sidebar-hover rounded-lg text-foreground hover:bg-accent transition-colors"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/operaciones?${paginationParams.toString()}&page=${page + 1}`}
                  className="px-3 py-1 text-xs bg-sidebar-hover rounded-lg text-foreground hover:bg-accent transition-colors"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
