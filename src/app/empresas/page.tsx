import { prisma } from "@/lib/prisma";
import { formatCuit } from "@/lib/format";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import ColumnFilter from "@/components/ColumnFilter";
import ClearFilters from "@/components/ClearFilters";

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");
  const pageSize = 25;
  const sortCol = params.sort || "razonSocial";
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  // Column filters
  const fTipo = params.f_tipo || "";
  const fEstado = params.f_estado || "";
  const fRubro = params.f_rubro || "";
  const fRazonSocial = params.f_razonSocial || "";
  const fCuit = params.f_cuit || "";
  const fContacto = params.f_contacto || "";

  const where: any = { AND: [] };

  // Global search
  if (query) {
    where.AND.push({
      OR: [
        { razonSocial: { contains: query, mode: "insensitive" } },
        { cuit: { contains: query } },
        { rubro: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  // Column-specific filters (support multi-value with || separator)
  if (fTipo === "clientes") where.AND.push({ esCliente: true });
  if (fTipo === "proveedores") where.AND.push({ esProveedor: true });
  if (fTipo === "ambos") where.AND.push({ esCliente: true, esProveedor: true });
  if (fEstado === "ACTIVO") where.AND.push({ estado: "ACTIVO" });
  if (fEstado === "INACTIVO") where.AND.push({ estado: "INACTIVO" });
  if (fEstado === "sin_estado") where.AND.push({ estado: null });
  if (fRubro) {
    const vals = fRubro.split("||");
    if (vals.length > 1) {
      where.AND.push({ rubro: { in: vals } });
    } else {
      where.AND.push({ rubro: { contains: fRubro, mode: "insensitive" } });
    }
  }
  if (fRazonSocial) {
    const vals = fRazonSocial.split("||");
    if (vals.length > 1) {
      where.AND.push({ razonSocial: { in: vals } });
    } else {
      where.AND.push({ razonSocial: { contains: fRazonSocial, mode: "insensitive" } });
    }
  }
  if (fCuit) {
    const vals = fCuit.split("||");
    if (vals.length > 1) {
      where.AND.push({ cuit: { in: vals } });
    } else {
      where.AND.push({ cuit: { contains: fCuit } });
    }
  }
  if (fContacto) {
    where.AND.push({
      contactos: { some: { nombre: { contains: fContacto, mode: "insensitive" } } },
    });
  }

  if (where.AND.length === 0) delete where.AND;

  // Build orderBy
  const validSortCols: Record<string, any> = {
    razonSocial: { razonSocial: sortDir },
    cuit: { cuit: sortDir },
    rubro: { rubro: sortDir },
    estado: { estado: sortDir },
  };
  const orderBy = validSortCols[sortCol] || { razonSocial: "asc" };

  const [empresas, total] = await Promise.all([
    prisma.empresa.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contactos: { select: { nombre: true }, take: 1 },
        _count: {
          select: {
            operacionesCliente: true,
            operacionesProveedor: true,
          },
        },
      },
    }),
    prisma.empresa.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Build current params string for pagination links
  const paginationParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") paginationParams.set(k, v);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Empresas</h1>
          <p className="text-muted text-sm">{total} empresas registradas</p>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="max-w-sm w-full">
            <SearchInput placeholder="Buscar por razon social, CUIT o rubro..." />
          </div>
          <ClearFilters />
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="text-muted text-left border-b border-border-color bg-sidebar-bg">
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="cuit" label="CUIT" table="empresa" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="razonSocial" label="Razon Social" table="empresa" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <ColumnFilter column="rubro" label="Rubro" table="empresa" />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <ColumnFilter
                    column="tipo"
                    label="Tipo"
                    type="select"
                    staticOptions={[
                      { value: "clientes", label: "Clientes" },
                      { value: "proveedores", label: "Proveedores" },
                      { value: "ambos", label: "Ambos" },
                    ]}
                  />
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <ColumnFilter
                    column="estado"
                    label="Estado"
                    type="select"
                    staticOptions={[
                      { value: "ACTIVO", label: "Activo" },
                      { value: "INACTIVO", label: "Inactivo" },
                      { value: "sin_estado", label: "Sin estado" },
                    ]}
                  />
                </th>
                <th className="px-4 py-3 font-medium text-center">Ops</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-sidebar-hover/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-muted text-xs">
                    {formatCuit(emp.cuit)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/empresas/${emp.id}`}
                      className="text-foreground hover:text-accent transition-colors"
                    >
                      {emp.razonSocial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[200px] truncate">
                    {emp.rubro || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {emp.esCliente && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                          C
                        </span>
                      )}
                      {emp.esProveedor && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                          P
                        </span>
                      )}
                      {!emp.esCliente && !emp.esProveedor && (
                        <span className="text-xs text-muted">{"\u2014"}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {emp.estado === "ACTIVO" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                        Activo
                      </span>
                    ) : emp.estado === "INACTIVO" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                        Inactivo
                      </span>
                    ) : (
                      <span className="text-xs text-muted">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-muted text-xs">
                    {emp._count.operacionesCliente + emp._count.operacionesProveedor}
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    No se encontraron empresas con los filtros aplicados.
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
                  href={`/empresas?${paginationParams.toString()}&page=${page - 1}`}
                  className="px-3 py-1 text-xs bg-sidebar-hover rounded-lg text-foreground hover:bg-accent transition-colors"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/empresas?${paginationParams.toString()}&page=${page + 1}`}
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
