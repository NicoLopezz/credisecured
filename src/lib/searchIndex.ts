import { prisma } from "./prisma";

export type EntityType =
  | "EMPRESA"
  | "CONTACTO"
  | "BANCO"
  | "DOCUMENTO"
  | "NOTA"
  | "OPERACION";

export type NumericKind =
  | "CUIT"
  | "CBU"
  | "PHONE"
  | "DOC_NO"
  | "AMOUNT"
  | "OTHER";

type IndexEntry = {
  entityType: EntityType;
  entityId: number;
  empresaId: number | null;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  url: string;
};

type NumericEntry = {
  entityType: EntityType;
  entityId: number;
  empresaId: number | null;
  kind: NumericKind;
  raw: string;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export async function upsertSearchEntry(entry: IndexEntry) {
  await prisma.searchIndex.upsert({
    where: {
      entityType_entityId: {
        entityType: entry.entityType,
        entityId: entry.entityId,
      },
    },
    update: {
      title: entry.title,
      subtitle: entry.subtitle ?? null,
      body: entry.body ?? null,
      url: entry.url,
      empresaId: entry.empresaId,
      updatedAt: new Date(),
    },
    create: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      empresaId: entry.empresaId,
      title: entry.title,
      subtitle: entry.subtitle ?? null,
      body: entry.body ?? null,
      url: entry.url,
    },
  });
}

export async function deleteSearchEntry(
  entityType: EntityType,
  entityId: number
) {
  await prisma.searchIndex.deleteMany({
    where: { entityType, entityId },
  });
}

export async function upsertNumericRefs(
  entityType: EntityType,
  entityId: number,
  empresaId: number | null,
  refs: { kind: NumericKind; raw: string }[]
) {
  await prisma.numericRef.deleteMany({ where: { entityType, entityId } });
  const toCreate = refs
    .map((r) => ({
      entityType,
      entityId,
      empresaId,
      kind: r.kind,
      raw: r.raw,
      digits: digitsOnly(r.raw),
    }))
    .filter((r) => r.digits.length > 0);
  if (toCreate.length > 0) {
    await prisma.numericRef.createMany({ data: toCreate });
  }
}

export async function reindexAll() {
  await prisma.numericRef.deleteMany();
  await prisma.searchIndex.deleteMany();

  const empresas = await prisma.empresa.findMany({
    include: {
      contactos: true,
      datosBancarios: true,
      documentos: true,
      notas: true,
      operacionesCliente: {
        include: { proveedor: { select: { razonSocial: true } } },
      },
      operacionesProveedor: {
        include: { cliente: { select: { razonSocial: true } } },
      },
    },
  });

  const rows: IndexEntry[] = [];
  const numRows: Array<{
    entityType: EntityType;
    entityId: number;
    empresaId: number | null;
    kind: NumericKind;
    digits: string;
    raw: string;
  }> = [];

  const pushNum = (
    entityType: EntityType,
    entityId: number,
    empresaId: number | null,
    kind: NumericKind,
    raw: string | null | undefined
  ) => {
    if (!raw) return;
    const digits = digitsOnly(raw);
    if (!digits) return;
    numRows.push({ entityType, entityId, empresaId, kind, digits, raw });
  };

  for (const e of empresas) {
    rows.push({
      entityType: "EMPRESA",
      entityId: e.id,
      empresaId: e.id,
      title: e.razonSocial,
      subtitle: `CUIT ${e.cuit}${e.rubro ? ` · ${e.rubro}` : ""}`,
      body: [
        e.actividadPrimaria,
        e.actividadSecundaria,
        e.otrasActividades,
        e.observaciones,
        e.comentarios,
      ]
        .filter(Boolean)
        .join(" · "),
      url: `/empresas/${e.id}`,
    });
    pushNum("EMPRESA", e.id, e.id, "CUIT", e.cuit);

    for (const c of e.contactos) {
      rows.push({
        entityType: "CONTACTO",
        entityId: c.id,
        empresaId: e.id,
        title: c.nombre,
        subtitle: `${c.rol ?? "Contacto"} · ${e.razonSocial}`,
        body: [c.email, c.telefono, c.whatsapp].filter(Boolean).join(" · "),
        url: `/empresas/${e.id}?tab=info#contacto-${c.id}`,
      });
      pushNum("CONTACTO", c.id, e.id, "PHONE", c.telefono);
      pushNum("CONTACTO", c.id, e.id, "PHONE", c.whatsapp);
    }

    for (const b of e.datosBancarios) {
      rows.push({
        entityType: "BANCO",
        entityId: b.id,
        empresaId: e.id,
        title: `${b.banco} — ${e.razonSocial}`,
        subtitle: `CBU ${b.cbu}${b.alias ? ` · alias ${b.alias}` : ""}`,
        body: [b.titular, b.tipo].filter(Boolean).join(" · "),
        url: `/empresas/${e.id}?tab=info#banco-${b.id}`,
      });
      pushNum("BANCO", b.id, e.id, "CBU", b.cbu);
    }

    for (const d of e.documentos) {
      rows.push({
        entityType: "DOCUMENTO",
        entityId: d.id,
        empresaId: e.id,
        title: d.nombre,
        subtitle: `${d.tipo} · ${e.razonSocial}`,
        body: d.mime,
        url: `/empresas/${e.id}?tab=documentos#doc-${d.id}`,
      });
      const matches = (d.nombre.match(/\d{3,}/g) ?? []).slice(0, 4);
      for (const m of matches) pushNum("DOCUMENTO", d.id, e.id, "DOC_NO", m);
    }

    for (const n of e.notas) {
      rows.push({
        entityType: "NOTA",
        entityId: n.id,
        empresaId: e.id,
        title: `${n.tipo} · ${e.razonSocial}`,
        subtitle: n.usuario ? `por ${n.usuario}` : undefined,
        body: n.texto,
        url: `/empresas/${e.id}?tab=actividad#nota-${n.id}`,
      });
    }

    for (const op of e.operacionesCliente) {
      rows.push({
        entityType: "OPERACION",
        entityId: op.id,
        empresaId: e.id,
        title: `${e.razonSocial} → ${op.proveedor.razonSocial}`,
        subtitle: `${op.status} · ${op.mes}/${op.anio} · $${op.importe.toString()}`,
        body: op.comentario,
        url: `/operaciones#op-${op.id}`,
      });
      pushNum("OPERACION", op.id, e.id, "AMOUNT", op.importe.toString());
    }
    // operacionesProveedor ya cubierto por el cliente en el otro lado
  }

  if (rows.length === 0) return 0;

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.searchIndex.createMany({
      data: rows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  for (let i = 0; i < numRows.length; i += CHUNK) {
    await prisma.numericRef.createMany({
      data: numRows.slice(i, i + CHUNK),
    });
  }
  return rows.length;
}

export type SearchHit = {
  entityType: EntityType;
  entityId: number;
  empresaId: number | null;
  title: string;
  subtitle: string | null;
  url: string;
  score: number;
  matchKind?: NumericKind | null;
  matchRaw?: string | null;
};

function isNumericQuery(q: string): boolean {
  const stripped = q.replace(/[\s\-\.\+\(\)]/g, "");
  return stripped.length >= 2 && /^\d+$/.test(stripped);
}

async function searchText(q: string, limit: number): Promise<SearchHit[]> {
  return prisma.$queryRawUnsafe<SearchHit[]>(
    `
    SELECT
      "entityType", "entityId", "empresaId",
      title, subtitle, url,
      (
        ts_rank(tsv, plainto_tsquery('spanish', $1)) * 2
        + similarity(title, $1)
        + CASE WHEN title ILIKE '%' || $1 || '%' THEN 0.5 ELSE 0 END
      )::float AS score,
      NULL::text AS "matchKind",
      NULL::text AS "matchRaw"
    FROM "SearchIndex"
    WHERE tsv @@ plainto_tsquery('spanish', $1)
       OR title ILIKE '%' || $1 || '%'
       OR title % $1
    ORDER BY score DESC
    LIMIT $2
    `,
    q,
    limit
  );
}

async function searchNumeric(q: string, limit: number): Promise<SearchHit[]> {
  const d = digitsOnly(q);
  if (!d) return [];

  return prisma.$queryRawUnsafe<SearchHit[]>(
    `
    SELECT DISTINCT ON (s."entityType", s."entityId")
      s."entityType", s."entityId", s."empresaId",
      s.title, s.subtitle, s.url,
      (
        CASE
          WHEN n.digits = $1 THEN 100
          WHEN n.digits LIKE $1 || '%' THEN 80
          WHEN n.digits LIKE '%' || $1 THEN 40
          ELSE 20 + COALESCE(similarity(n.digits, $1), 0) * 10
        END
        + CASE
            WHEN length($1) = 11 AND n.kind = 'CUIT' THEN 30
            WHEN length($1) = 22 AND n.kind = 'CBU'  THEN 30
            WHEN length($1) BETWEEN 8 AND 13 AND n.kind = 'PHONE' THEN 15
            ELSE 0
          END
      )::float AS score,
      n.kind AS "matchKind",
      n.raw  AS "matchRaw"
    FROM "NumericRef" n
    JOIN "SearchIndex" s
      ON s."entityType" = n."entityType" AND s."entityId" = n."entityId"
    WHERE n.digits LIKE $1 || '%'
       OR n.digits LIKE '%' || $1 || '%'
    ORDER BY s."entityType", s."entityId", score DESC
    LIMIT $2
    `,
    d,
    limit * 3
  ).then((rows) =>
    rows.sort((a, b) => b.score - a.score).slice(0, limit)
  );
}

export async function searchAll(query: string, limit = 30): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (isNumericQuery(q)) {
    const numeric = await searchNumeric(q, limit);
    if (numeric.length >= limit) return numeric;
    // si hay pocos resultados numéricos, completamos con texto
    const textual = await searchText(q, limit - numeric.length);
    const seen = new Set(numeric.map((h) => `${h.entityType}-${h.entityId}`));
    const extra = textual.filter(
      (h) => !seen.has(`${h.entityType}-${h.entityId}`)
    );
    return [...numeric, ...extra];
  }

  // Query mixta o textual: corremos ambos y mergeamos
  const [textual, numericResults] = await Promise.all([
    searchText(q, limit),
    digitsOnly(q).length >= 2 ? searchNumeric(q, 10) : Promise.resolve([]),
  ]);

  const merged = new Map<string, SearchHit>();
  for (const h of textual) merged.set(`${h.entityType}-${h.entityId}`, h);
  for (const h of numericResults) {
    const key = `${h.entityType}-${h.entityId}`;
    const existing = merged.get(key);
    if (!existing || existing.score < h.score) merged.set(key, h);
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
