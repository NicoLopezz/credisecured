import { NextResponse } from "next/server";
import { searchAll } from "@/lib/searchIndex";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const hits = await searchAll(q, 30);

  // Enrich con info de empresa (cliente / proveedor / razón social)
  const empresaIds = [...new Set(hits.map((h) => h.empresaId).filter((x): x is number => x !== null))];
  const empresas = empresaIds.length
    ? await prisma.empresa.findMany({
        where: { id: { in: empresaIds } },
        select: { id: true, razonSocial: true, esCliente: true, esProveedor: true },
      })
    : [];
  const empresaMap = new Map(empresas.map((e) => [e.id, e]));

  const enriched = hits.map((h) => {
    const e = h.empresaId != null ? empresaMap.get(h.empresaId) : null;
    return {
      ...h,
      empresaRazonSocial: e?.razonSocial ?? null,
      empresaEsCliente: e?.esCliente ?? false,
      empresaEsProveedor: e?.esProveedor ?? false,
    };
  });

  const grouped: Record<string, typeof enriched> = {};
  for (const h of enriched) {
    (grouped[h.entityType] ??= []).push(h);
  }
  return NextResponse.json({ query: q, total: enriched.length, grouped });
}
