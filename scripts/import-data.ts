import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = path.join(__dirname, "..", "data");

function readCSV(filename: string): string[][] {
  const content = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
  return parse(content, {
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: false,
  });
}

function cleanCuit(raw: string): string {
  return raw.replace(/[^0-9]/g, "").trim();
}

function parseArgNumber(raw: string): number {
  if (!raw || raw === "" || raw === "N/T" || raw === "SIN DATOS" || raw === "#N/A" || raw === "#REF!") return 0;
  // Argentine format: $1.234.567,89 or just 1.234,56
  let cleaned = raw.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "") return 0;
  // Remove thousand dots, replace decimal comma with dot
  // Pattern: dots are thousands, comma is decimal
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDecimalStr(raw: string): string | null {
  if (!raw || raw === "" || raw === "N/T" || raw === "SIN DATOS" || raw === "#N/A" || raw === "#REF!") return null;
  let cleaned = raw.replace(/\$/g, "").replace(/\s/g, "").replace(/"/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num.toString();
}

function parseInt2(raw: string): number | null {
  if (!raw || raw === "" || raw === "N/T" || raw === "SIN DATOS") return null;
  const num = parseInt(raw, 10);
  return isNaN(num) ? null : num;
}

async function importEmpresas() {
  console.log("=== Importing Empresas (Base de Datos A) ===");
  const rows = readCSV("Operaciones - Base de Datos A (Actual).csv");

  // Row 0 is metadata (year/month), row 1 is headers, data starts at row 2
  let imported = 0;
  let skipped = 0;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const cuit = cleanCuit(row[0] || "");
    if (!cuit || cuit.length < 7) {
      skipped++;
      continue;
    }

    const razonSocial = (row[8] || row[2] || "").trim();
    if (!razonSocial) {
      skipped++;
      continue;
    }

    const vigencia = (row[15] || "").trim();
    const esCliente = (row[22] || "").trim();
    const esProveedor = (row[20] || "").trim();
    const estado = (row[6] || "").trim();

    try {
      await prisma.empresa.upsert({
        where: { cuit },
        create: {
          cuit,
          comprobante: (row[1] || "").trim() || null,
          razonSocial,
          nombreWhatsapp: (row[7] || "").trim() || null,
          actividadPrimaria: (row[9] || "").trim() || null,
          actividadSecundaria: (row[10] || "").trim() || null,
          otrasActividades: (row[11] || "").trim() || null,
          rubro: (row[12] || "").trim() || null,
          observaciones: (row[13] || "").trim() || null,
          comentarios: (row[14] || "").trim() || null,
          vigencia: vigencia || null,
          estado: estado || null,
          esCliente: esCliente === "SI",
          esProveedor: esProveedor === "SI",
          costoA: parseDecimalStr(row[23] || ""),
          costoB: parseDecimalStr(row[24] || ""),
          costoC: parseDecimalStr(row[25] || ""),
          percepciones: parseInt2(row[26] || ""),
          retenciones: parseInt2(row[27] || ""),
          costoAdicional: parseDecimalStr(row[28] || ""),
          url: (row[31] || "").trim() || null,
        },
        update: {
          comprobante: (row[1] || "").trim() || null,
          razonSocial,
          nombreWhatsapp: (row[7] || "").trim() || null,
          actividadPrimaria: (row[9] || "").trim() || null,
          actividadSecundaria: (row[10] || "").trim() || null,
          otrasActividades: (row[11] || "").trim() || null,
          rubro: (row[12] || "").trim() || null,
          observaciones: (row[13] || "").trim() || null,
          comentarios: (row[14] || "").trim() || null,
          vigencia: vigencia || null,
          estado: estado || null,
          esCliente: esCliente === "SI",
          esProveedor: esProveedor === "SI",
          costoA: parseDecimalStr(row[23] || ""),
          costoB: parseDecimalStr(row[24] || ""),
          costoC: parseDecimalStr(row[25] || ""),
          percepciones: parseInt2(row[26] || ""),
          retenciones: parseInt2(row[27] || ""),
          costoAdicional: parseDecimalStr(row[28] || ""),
          url: (row[31] || "").trim() || null,
        },
      });
      imported++;
    } catch (e: any) {
      console.error(`  Error row ${i} (CUIT: ${cuit}): ${e.message}`);
      skipped++;
    }
  }

  // Also import contactos from the CLIENTE and PROVEEDOR columns
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const cuit = cleanCuit(row[0] || "");
    if (!cuit || cuit.length < 7) continue;

    const empresa = await prisma.empresa.findUnique({ where: { cuit } });
    if (!empresa) continue;

    const contactoCliente = (row[2] || "").trim();
    const contactoComercialC = (row[3] || "").trim();
    const contactoProveedor = (row[4] || "").trim();
    const contactoComercialP = (row[5] || "").trim();

    const contactos: { nombre: string; rol: string }[] = [];
    if (contactoCliente) contactos.push({ nombre: contactoCliente, rol: "COMERCIAL_CLIENTE" });
    if (contactoComercialC && contactoComercialC !== contactoCliente) {
      contactos.push({ nombre: contactoComercialC, rol: "COMERCIAL_CLIENTE" });
    }
    if (contactoProveedor) contactos.push({ nombre: contactoProveedor, rol: "COMERCIAL_PROVEEDOR" });
    if (contactoComercialP && contactoComercialP !== contactoProveedor) {
      contactos.push({ nombre: contactoComercialP, rol: "COMERCIAL_PROVEEDOR" });
    }

    for (const c of contactos) {
      const exists = await prisma.contacto.findFirst({
        where: { empresaId: empresa.id, nombre: c.nombre, rol: c.rol },
      });
      if (!exists) {
        await prisma.contacto.create({
          data: { nombre: c.nombre, rol: c.rol, empresaId: empresa.id },
        });
      }
    }
  }

  console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
}

async function importEmpresasM() {
  console.log("=== Importing Empresas (Base de Datos M) ===");
  const rows = readCSV("Operaciones - Base de Datos M.csv");

  // Headers at row 0 for this file
  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cuit = cleanCuit(row[0] || "");
    if (!cuit || cuit.length < 7) {
      skipped++;
      continue;
    }

    const razonSocial = (row[6] || row[2] || "").trim();
    if (!razonSocial) {
      skipped++;
      continue;
    }

    // Only insert if doesn't exist (Base A takes priority)
    const exists = await prisma.empresa.findUnique({ where: { cuit } });
    if (exists) {
      skipped++;
      continue;
    }

    try {
      await prisma.empresa.create({
        data: {
          cuit,
          comprobante: (row[1] || "").trim() || null,
          razonSocial,
          actividadPrimaria: (row[7] || "").trim() || null,
          actividadSecundaria: (row[8] || "").trim() || null,
          otrasActividades: (row[9] || "").trim() || null,
          rubro: (row[10] || "").trim() || null,
          observaciones: (row[12] || "").trim() || null,
          esCliente: false,
          esProveedor: false,
        },
      });
      imported++;
    } catch (e: any) {
      console.error(`  Error row ${i} (CUIT: ${cuit}): ${e.message}`);
      skipped++;
    }
  }
  console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
}

async function importCuposProveedor() {
  console.log("=== Importing Cupos Proveedor ===");
  const rows = readCSV("Operaciones - Cupo_Proveedor.csv");

  let imported = 0;
  let skipped = 0;

  // Header: FECHA,AÑO,MES,CUIT,RAZON SOCIAL,IMPORTE,CUPO RESTANTE,CUPO PENDIENTE,CUPO ENVIADO,OBSERVACIONES,CONTACTO
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cuit = cleanCuit(row[3] || "");
    if (!cuit || cuit.length < 7) {
      skipped++;
      continue;
    }

    const fecha = parseInt2(row[0] || "") || 1;
    const anio = parseInt2(row[1] || "") || 2025;
    const mes = parseInt2(row[2] || "") || 1;

    const empresa = await prisma.empresa.findUnique({ where: { cuit } });
    if (!empresa) {
      // Create empresa if not exists
      const razonSocial = (row[4] || "").trim();
      if (!razonSocial) { skipped++; continue; }
      try {
        const newEmpresa = await prisma.empresa.create({
          data: { cuit, razonSocial, esProveedor: true },
        });
        await prisma.cupoProveedor.create({
          data: {
            empresaId: newEmpresa.id,
            anio, mes, fecha,
            importe: parseArgNumber(row[5] || "").toString(),
            cupoRestante: parseArgNumber(row[6] || "").toString(),
            cupoPendiente: parseArgNumber(row[7] || "").toString(),
            cupoEnviado: parseArgNumber(row[8] || "").toString(),
            observaciones: (row[9] || "").trim() || null,
            contacto: (row[10] || "").trim() || null,
          },
        });
        imported++;
      } catch (e: any) {
        console.error(`  Error row ${i}: ${e.message}`);
        skipped++;
      }
      continue;
    }

    // Mark as proveedor
    if (!empresa.esProveedor) {
      await prisma.empresa.update({ where: { id: empresa.id }, data: { esProveedor: true } });
    }

    try {
      await prisma.cupoProveedor.upsert({
        where: {
          empresaId_anio_mes_fecha: { empresaId: empresa.id, anio, mes, fecha },
        },
        create: {
          empresaId: empresa.id,
          anio, mes, fecha,
          importe: parseArgNumber(row[5] || "").toString(),
          cupoRestante: parseArgNumber(row[6] || "").toString(),
          cupoPendiente: parseArgNumber(row[7] || "").toString(),
          cupoEnviado: parseArgNumber(row[8] || "").toString(),
          observaciones: (row[9] || "").trim() || null,
          contacto: (row[10] || "").trim() || null,
        },
        update: {
          importe: parseArgNumber(row[5] || "").toString(),
          cupoRestante: parseArgNumber(row[6] || "").toString(),
          cupoPendiente: parseArgNumber(row[7] || "").toString(),
          cupoEnviado: parseArgNumber(row[8] || "").toString(),
          observaciones: (row[9] || "").trim() || null,
          contacto: (row[10] || "").trim() || null,
        },
      });
      imported++;
    } catch (e: any) {
      console.error(`  Error row ${i} (CUIT: ${cuit}): ${e.message}`);
      skipped++;
    }
  }
  console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
}

async function importPedidosCliente() {
  console.log("=== Importing Pedidos Cliente ===");
  const rows = readCSV("Operaciones - Pedido_Cliente (1).csv");

  let imported = 0;
  let skipped = 0;

  // Header: FECHA,AÑO,mes,CUIT,RAZON SOCIAL,IMPORTE,PEDIDO RESTANTE,observaciones,CONTACTO
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cuit = cleanCuit(row[3] || "");
    if (!cuit || cuit.length < 7) {
      skipped++;
      continue;
    }

    const fecha = parseInt2(row[0] || "") || 1;
    const anio = parseInt2(row[1] || "") || 2025;
    const mes = parseInt2(row[2] || "") || 1;

    let empresa = await prisma.empresa.findUnique({ where: { cuit } });
    if (!empresa) {
      const razonSocial = (row[4] || "").trim();
      if (!razonSocial) { skipped++; continue; }
      empresa = await prisma.empresa.create({
        data: { cuit, razonSocial, esCliente: true },
      });
    } else if (!empresa.esCliente) {
      await prisma.empresa.update({ where: { id: empresa.id }, data: { esCliente: true } });
    }

    try {
      await prisma.pedidoCliente.upsert({
        where: {
          empresaId_anio_mes_fecha: { empresaId: empresa.id, anio, mes, fecha },
        },
        create: {
          empresaId: empresa.id,
          anio, mes, fecha,
          importe: parseArgNumber(row[5] || "").toString(),
          pedidoRestante: parseArgNumber(row[6] || "").toString(),
          observaciones: (row[7] || "").trim() || null,
          contacto: (row[8] || "").trim() || null,
        },
        update: {
          importe: parseArgNumber(row[5] || "").toString(),
          pedidoRestante: parseArgNumber(row[6] || "").toString(),
          observaciones: (row[7] || "").trim() || null,
          contacto: (row[8] || "").trim() || null,
        },
      });
      imported++;
    } catch (e: any) {
      console.error(`  Error row ${i} (CUIT: ${cuit}): ${e.message}`);
      skipped++;
    }
  }
  console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
}

async function importOperaciones() {
  console.log("=== Importing Operaciones (Pedidos/Matches) ===");
  const rows = readCSV("Operaciones - Pedidos.csv");

  let imported = 0;
  let skipped = 0;

  // Header: Año,Mes,CUIT Cliente,CLIENTES,CUIT Proveedor,Proveedores,Importe,Status,Fecha,...
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cuitCliente = cleanCuit(row[2] || "");
    const cuitProveedor = cleanCuit(row[4] || "");
    if (!cuitCliente || cuitCliente.length < 7 || !cuitProveedor || cuitProveedor.length < 7) {
      skipped++;
      continue;
    }

    const anio = parseInt2(row[0] || "") || 2025;
    const mes = parseInt2(row[1] || "") || 1;

    let cliente = await prisma.empresa.findUnique({ where: { cuit: cuitCliente } });
    if (!cliente) {
      const nombre = (row[3] || "").trim();
      if (!nombre) { skipped++; continue; }
      cliente = await prisma.empresa.create({
        data: { cuit: cuitCliente, razonSocial: nombre, esCliente: true },
      });
    }

    let proveedor = await prisma.empresa.findUnique({ where: { cuit: cuitProveedor } });
    if (!proveedor) {
      const nombre = (row[5] || "").trim();
      if (!nombre) { skipped++; continue; }
      proveedor = await prisma.empresa.create({
        data: { cuit: cuitProveedor, razonSocial: nombre, esProveedor: true },
      });
    }

    // Parse date (format: d/m/yyyy or dd/mm/yyyy)
    let fecha: Date;
    const fechaRaw = (row[8] || "").trim();
    if (fechaRaw) {
      const parts = fechaRaw.split("/");
      if (parts.length === 3) {
        fecha = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        fecha = new Date(anio, mes - 1, 1);
      }
    } else {
      fecha = new Date(anio, mes - 1, 1);
    }

    try {
      await prisma.operacion.create({
        data: {
          anio, mes,
          clienteId: cliente.id,
          proveedorId: proveedor.id,
          importe: parseArgNumber(row[6] || "").toString(),
          status: (row[7] || "Pendiente").trim(),
          fecha,
          clienteContacto: (row[13] || "").trim() || null,
          proveedorContacto: (row[14] || "").trim() || null,
        },
      });
      imported++;
    } catch (e: any) {
      console.error(`  Error row ${i}: ${e.message}`);
      skipped++;
    }
  }
  console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
}

async function main() {
  console.log("Starting import...\n");

  await importEmpresas();
  await importEmpresasM();
  await importCuposProveedor();
  await importPedidosCliente();
  await importOperaciones();

  // Print summary
  const empresaCount = await prisma.empresa.count();
  const contactoCount = await prisma.contacto.count();
  const cupoCount = await prisma.cupoProveedor.count();
  const pedidoCount = await prisma.pedidoCliente.count();
  const operacionCount = await prisma.operacion.count();

  console.log("\n=== SUMMARY ===");
  console.log(`Empresas:    ${empresaCount}`);
  console.log(`Contactos:   ${contactoCount}`);
  console.log(`Cupos:       ${cupoCount}`);
  console.log(`Pedidos:     ${pedidoCount}`);
  console.log(`Operaciones: ${operacionCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
