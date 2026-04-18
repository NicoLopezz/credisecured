import "dotenv/config";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  // Format: d/m/yyyy
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function parseCuit(raw: string): string {
  return raw.replace(/[-\s]/g, "").trim();
}

async function main() {
  const csv = readFileSync("data/Operaciones - Pedidos.csv", "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Processing ${records.length} records...`);

  let updated = 0;
  let notFound = 0;

  for (const row of records) {
    const cuitCliente = parseCuit(row["CUIT Cliente"] || "");
    const cuitProveedor = parseCuit(row["CUIT Proveedor"] || "");
    const comentario = (row["Columna 10"] || "").trim() || null;
    const clienteEnviado = (row["ClienteEnviado"] || "").trim() || null;
    const proveedorRecibido = (row["ProveedorRecibido"] || "").trim() || null;
    const fechaArmado = parseDate(row["Fecha Armado"] || "");

    // Skip if nothing to update
    if (!comentario && !clienteEnviado && !proveedorRecibido && !fechaArmado) continue;

    // Find the operation by matching client CUIT, provider CUIT, año, mes, and importe
    const anio = parseInt(row["Año"]);
    const mes = parseInt(row["Mes"]);
    const importeStr = (row["Importe"] || "")
      .replace(/\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const importe = parseFloat(importeStr);

    if (!cuitCliente || !cuitProveedor || isNaN(anio) || isNaN(mes) || isNaN(importe)) continue;

    // Find client and provider IDs
    const cliente = await prisma.empresa.findUnique({ where: { cuit: cuitCliente }, select: { id: true } });
    const proveedor = await prisma.empresa.findUnique({ where: { cuit: cuitProveedor }, select: { id: true } });
    if (!cliente || !proveedor) {
      notFound++;
      continue;
    }

    // Find matching operation
    const ops = await prisma.operacion.findMany({
      where: {
        clienteId: cliente.id,
        proveedorId: proveedor.id,
        anio,
        mes,
        importe,
      },
      take: 1,
    });

    if (ops.length === 0) {
      notFound++;
      continue;
    }

    await prisma.operacion.update({
      where: { id: ops[0].id },
      data: {
        ...(comentario ? { comentario } : {}),
        ...(clienteEnviado ? { clienteEnviado } : {}),
        ...(proveedorRecibido ? { proveedorRecibido } : {}),
        ...(fechaArmado ? { fechaArmado } : {}),
      },
    });
    updated++;
  }

  console.log(`Done. Updated: ${updated}, Not found: ${notFound}`);
  await prisma.$disconnect();
}

main().catch(console.error);
