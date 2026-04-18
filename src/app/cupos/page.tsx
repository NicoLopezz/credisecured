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

export default async function CuposPage({
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

  const fProveedor = params.f_proveedor || "";
  const fContacto = params.f_contacto || "";
  const fObs = params.f_observaciones || "";

  // Available periods
  const periodos = await prisma.cupoProveedor.groupBy({
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
  if (fProveedor) {
    const vals = fProveedor.split("||");
    if (vals.length > 1) {
      where.AND.push({ empresa: { razonSocial: { in: vals } } });
    } else {
      where.AND.push({ empresa: { razonSocial: { contains: fProveedor, mode: "insensitive" } } });
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

  type SortOrder = "asc" | "desc";
  const validSortCols: Record<string, any> = {
    periodo: [{ anio: sortDir as SortOrder }, { mes: sortDir as SortOrder }, { fecha: sortDir as SortOrder }],
    proveedor: { empresa: { razonSocial: sortDir } },
    importe: { importe: sortDir },
    cupoRestante: { cupoRestante: sortDir },
    cupoPendiente: { cupoPendiente: sortDir },
    cupoEnviado: { cupoEnviado: sortDir },
    contacto: { contacto: sortDir },
  };
  const orderBy = validSortCols[sortCol] || [{ anio: "desc" }, { mes: "desc" }, { fecha: "desc" }];

  const [cupos, total, aggregate] = await Promise.all([
    prisma.cupoProveedor.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        empresa: { select: { id: true, razonSocial: true, cuit: true } },
      },
    }),
    prisma.cupoProveedor.count({ where }),
    prisma.cupoProveedor.aggregate({ where, _sum: { importe: true, cupoEnviado: true } }),
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Cupo Proveedor</h1>
          <p className="text-muted text-sm">
            {total} cupos &middot; Total: {formatARS(aggregate._sum.importe)} &middot; Enviado: {formatARS(aggregate._sum.cupoEnviado)}
          </p>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <PeriodFilter periodos={periodos.map((p) => ({ anio: p.anio, mes: p.mes }))} anio={anio} mes={mes} />
          <div className="max-w-xs w-full">
            <SearchInput placeholder="Buscar proveedor..." />
          </div>
          <ClearFilters />
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="w-full text-sm">
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
                  <ColumnFilter column="proveedor" label="Proveedor" table="cupoProveedor" />
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <ColumnFilter column="importe" label="Importe" />
                  <InfoTip text="Cupo total asignado al proveedor para el mes" />
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <ColumnFilter column="cupoRestante" label="Restante" />
                  <InfoTip text="Cupo del proveedor menos la suma de operaciones asignadas" />
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <ColumnFilter column="cupoPendiente" label="Pendiente" />
                  <InfoTip text="Monto de operaciones pendientes de envio al proveedor" />
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <ColumnFilter column="cupoEnviado" label="Enviado" />
                  <InfoTip text="Monto de operaciones ya enviadas al proveedor" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="observaciones" label="Observaciones" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="contacto" label="Contacto" table="cupoProveedor" />
                </th>
              </tr>
            </thead>
            <tbody>
              {cupos.map((c) => (
                <tr key={c.id} className="hover:bg-sidebar-hover/30 transition-colors">
                  <td className="px-4 py-3 text-muted text-xs font-mono">
                    {c.fecha}/{c.mes}/{c.anio}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/empresas/${c.empresa.id}`} className="text-foreground hover:text-accent transition-colors">
                      {c.empresa.razonSocial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-400">
                    {formatARS(c.importe)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${Number(c.cupoRestante) < 0 ? "text-red-400" : "text-muted"}`}>
                    {formatARS(c.cupoRestante)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${Number(c.cupoPendiente) > 0 ? "text-amber-500" : "text-muted"}`}>
                    {formatARS(c.cupoPendiente)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted">
                    {formatARS(c.cupoEnviado)}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[150px] truncate">
                    {c.observaciones || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {c.contacto || "\u2014"}
                  </td>
                </tr>
              ))}
              {cupos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    No se encontraron cupos con los filtros aplicados.
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
                <Link href={`/cupos?${paginationParams.toString()}&page=${page - 1}`} className="px-3 py-1 text-xs bg-sidebar-hover rounded-lg text-foreground hover:bg-accent transition-colors">
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/cupos?${paginationParams.toString()}&page=${page + 1}`} className="px-3 py-1 text-xs bg-sidebar-hover rounded-lg text-foreground hover:bg-accent transition-colors">
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
