import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import ColumnFilter from "@/components/ColumnFilter";
import InfoTip from "@/components/InfoTip";
import ClearFilters from "@/components/ClearFilters";
import PeriodFilter from "@/components/PeriodFilter";

const MESES_OPTS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2025, i).toLocaleString("es-AR", { month: "long" }),
}));

export default async function PedidosPage({
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
  const fContacto = params.f_contacto || "";
  const fObs = params.f_observaciones || "";

  // Available periods
  const periodos = await prisma.pedidoCliente.groupBy({
    by: ["anio", "mes"],
    _count: true,
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  const anio = parseInt(params.anio || String(periodos[0]?.anio || 2026));
  const mes = parseInt(params.mes || String(periodos[0]?.mes || 3));

  const where: any = { AND: [{ anio }, { mes }] };

  if (query) {
    where.AND.push({
      empresa: { razonSocial: { contains: query, mode: "insensitive" } },
    });
  }
  if (fCliente) {
    const vals = fCliente.split("||");
    if (vals.length > 1) {
      where.AND.push({ empresa: { razonSocial: { in: vals } } });
    } else {
      where.AND.push({ empresa: { razonSocial: { contains: fCliente, mode: "insensitive" } } });
    }
  }
  if (fContacto) {
    const vals = fContacto.split("||");
    if (vals.length > 1) {
      where.AND.push({ contacto: { in: vals } });
    } else {
      where.AND.push({ contacto: { contains: fContacto, mode: "insensitive" } });
    }
  }
  if (fObs) {
    where.AND.push({ observaciones: { contains: fObs, mode: "insensitive" } });
  }

  // Build orderBy
  type SortOrder = "asc" | "desc";
  const validSortCols: Record<string, any> = {
    periodo: [{ anio: sortDir as SortOrder }, { mes: sortDir as SortOrder }, { fecha: sortDir as SortOrder }],
    cliente: { empresa: { razonSocial: sortDir } },
    importe: { importe: sortDir },
    pedidoRestante: { pedidoRestante: sortDir },
    contacto: { contacto: sortDir },
  };
  const orderBy = validSortCols[sortCol] || [{ anio: "desc" }, { mes: "desc" }, { fecha: "desc" }];

  const [pedidos, total, aggregate] = await Promise.all([
    prisma.pedidoCliente.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        empresa: { select: { id: true, razonSocial: true, cuit: true } },
      },
    }),
    prisma.pedidoCliente.count({ where }),
    prisma.pedidoCliente.aggregate({ where, _sum: { importe: true } }),
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Pedido Cliente</h1>
          <p className="text-muted text-sm">
            {total} pedidos &middot; Total: {formatARS(aggregate._sum.importe)}
          </p>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <PeriodFilter periodos={periodos.map((p) => ({ anio: p.anio, mes: p.mes }))} anio={anio} mes={mes} />
          <div className="max-w-xs w-full">
            <SearchInput placeholder="Buscar cliente..." />
          </div>
          <ClearFilters />
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="text-muted text-left border-b border-border-color bg-sidebar-bg">
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter
                    column="periodo"
                    label="Periodo"
                    type="select"
                    staticOptions={MESES_OPTS}
                  />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="cliente" label="Cliente" table="pedidoCliente" />
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <ColumnFilter column="importe" label="Importe" />
                  <InfoTip text="Monto total del pedido del cliente para el mes" />
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <ColumnFilter column="pedidoRestante" label="Restante" />
                  <InfoTip text="Pedido del cliente menos la suma de operaciones asignadas" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="observaciones" label="Observaciones" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="contacto" label="Contacto" table="pedidoCliente" />
                </th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="hover:bg-sidebar-hover/30 transition-colors">
                  <td className="px-4 py-3 text-muted text-xs font-mono">
                    {p.fecha}/{p.mes}/{p.anio}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/empresas/${p.empresa.id}`} className="text-foreground hover:text-accent transition-colors">
                      {p.empresa.razonSocial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-400">
                    {formatARS(p.importe)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${Number(p.pedidoRestante) > 0 ? "text-yellow-400" : Number(p.pedidoRestante) < 0 ? "text-red-400" : "text-muted"}`}>
                    {formatARS(p.pedidoRestante)}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[200px] truncate">
                    {p.observaciones || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {p.contacto || "\u2014"}
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-color">
            <p className="text-xs text-muted">Pagina {page} de {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/pedidos?${paginationParams.toString()}&page=${page - 1}`}
                  className="px-3 py-1 text-xs bg-sidebar-hover rounded-lg text-foreground hover:bg-accent transition-colors"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/pedidos?${paginationParams.toString()}&page=${page + 1}`}
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
