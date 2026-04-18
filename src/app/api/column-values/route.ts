import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") || "";
  const column = req.nextUrl.searchParams.get("column") || "";
  const search = req.nextUrl.searchParams.get("search") || "";

  if (!table || !column) {
    return NextResponse.json({ values: [] });
  }

  try {
    let values: string[] = [];

    if (table === "empresa") {
      if (column === "razonSocial") {
        const rows = await prisma.empresa.findMany({
          where: search
            ? { razonSocial: { contains: search, mode: "insensitive" } }
            : {},
          select: { razonSocial: true },
          orderBy: { razonSocial: "asc" },
          take: 200,
        });
        values = rows.map((r) => r.razonSocial).filter(Boolean);
      } else if (column === "cuit") {
        const rows = await prisma.empresa.findMany({
          where: search ? { cuit: { contains: search } } : {},
          select: { cuit: true },
          orderBy: { cuit: "asc" },
          take: 200,
        });
        values = rows.map((r) => r.cuit);
      } else if (column === "rubro") {
        const rows = await prisma.empresa.findMany({
          where: {
            rubro: search
              ? { contains: search, mode: "insensitive", not: null }
              : { not: null },
          },
          select: { rubro: true },
          distinct: ["rubro"],
          orderBy: { rubro: "asc" },
          take: 200,
        });
        values = rows.map((r) => r.rubro).filter((v): v is string => !!v);
      } else if (column === "estado") {
        const rows = await prisma.empresa.findMany({
          where: { estado: { not: null } },
          select: { estado: true },
          distinct: ["estado"],
          orderBy: { estado: "asc" },
        });
        values = rows.map((r) => r.estado).filter((v): v is string => !!v);
      }
    }

    if (table === "pedidoCliente") {
      if (column === "cliente") {
        const rows = await prisma.pedidoCliente.findMany({
          where: search
            ? { empresa: { razonSocial: { contains: search, mode: "insensitive" } } }
            : {},
          select: { empresa: { select: { razonSocial: true } } },
          distinct: ["empresaId"],
          orderBy: { empresa: { razonSocial: "asc" } },
          take: 200,
        });
        values = rows.map((r) => r.empresa.razonSocial);
      } else if (column === "contacto") {
        const rows = await prisma.pedidoCliente.findMany({
          where: {
            contacto: search
              ? { contains: search, mode: "insensitive", not: null }
              : { not: null },
          },
          select: { contacto: true },
          distinct: ["contacto"],
          orderBy: { contacto: "asc" },
          take: 200,
        });
        values = rows.map((r) => r.contacto).filter((v): v is string => !!v);
      }
    }

    if (table === "cupoProveedor") {
      if (column === "proveedor") {
        const rows = await prisma.cupoProveedor.findMany({
          where: search
            ? { empresa: { razonSocial: { contains: search, mode: "insensitive" } } }
            : {},
          select: { empresa: { select: { razonSocial: true } } },
          distinct: ["empresaId"],
          orderBy: { empresa: { razonSocial: "asc" } },
          take: 200,
        });
        values = rows.map((r) => r.empresa.razonSocial);
      } else if (column === "contacto") {
        const rows = await prisma.cupoProveedor.findMany({
          where: {
            contacto: search
              ? { contains: search, mode: "insensitive", not: null }
              : { not: null },
          },
          select: { contacto: true },
          distinct: ["contacto"],
          orderBy: { contacto: "asc" },
          take: 200,
        });
        values = rows.map((r) => r.contacto).filter((v): v is string => !!v);
      }
    }

    if (table === "operacion") {
      if (column === "cliente") {
        const rows = await prisma.operacion.findMany({
          where: search
            ? { cliente: { razonSocial: { contains: search, mode: "insensitive" } } }
            : {},
          select: { cliente: { select: { razonSocial: true } } },
          distinct: ["clienteId"],
          orderBy: { cliente: { razonSocial: "asc" } },
          take: 200,
        });
        values = rows.map((r) => r.cliente.razonSocial);
      } else if (column === "proveedor") {
        const rows = await prisma.operacion.findMany({
          where: search
            ? { proveedor: { razonSocial: { contains: search, mode: "insensitive" } } }
            : {},
          select: { proveedor: { select: { razonSocial: true } } },
          distinct: ["proveedorId"],
          orderBy: { proveedor: { razonSocial: "asc" } },
          take: 200,
        });
        values = rows.map((r) => r.proveedor.razonSocial);
      } else if (column === "status") {
        const rows = await prisma.operacion.findMany({
          select: { status: true },
          distinct: ["status"],
          orderBy: { status: "asc" },
        });
        values = rows.map((r) => r.status);
      } else if (column === "contacto") {
        const rows1 = await prisma.operacion.findMany({
          where: {
            clienteContacto: search
              ? { contains: search, mode: "insensitive", not: null }
              : { not: null },
          },
          select: { clienteContacto: true },
          distinct: ["clienteContacto"],
          take: 100,
        });
        const rows2 = await prisma.operacion.findMany({
          where: {
            proveedorContacto: search
              ? { contains: search, mode: "insensitive", not: null }
              : { not: null },
          },
          select: { proveedorContacto: true },
          distinct: ["proveedorContacto"],
          take: 100,
        });
        const set = new Set<string>();
        for (const r of rows1) if (r.clienteContacto) set.add(r.clienteContacto);
        for (const r of rows2) if (r.proveedorContacto) set.add(r.proveedorContacto);
        values = Array.from(set).sort();
      }
    }

    return NextResponse.json({ values });
  } catch (e) {
    console.error("column-values error:", e);
    return NextResponse.json({ values: [] });
  }
}
