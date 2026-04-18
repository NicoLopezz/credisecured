import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { reindexAll } from "../src/lib/searchIndex";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type EmpresaSeed = {
  cuit: string;
  razonSocial: string;
  rubro: string;
  actividadPrimaria?: string;
  esCliente?: boolean;
  esProveedor?: boolean;
  estado?: string;
  costoA?: number;
  costoB?: number;
  costoC?: number;
  contactos: { nombre: string; rol: string; telefono?: string; email?: string }[];
};

const clientes: EmpresaSeed[] = [
  {
    cuit: "30500010912",
    razonSocial: "Distribuidora Pampa SA",
    rubro: "Consumo masivo",
    actividadPrimaria: "Distribución de alimentos",
    esCliente: true,
    estado: "ACTIVO",
    contactos: [
      { nombre: "Lucía Fernández", rol: "CFO", email: "lucia@pampa.com.ar", telefono: "+541145678901" },
      { nombre: "Martín Rossi", rol: "Tesorería", email: "martin@pampa.com.ar" },
    ],
  },
  {
    cuit: "30715500123",
    razonSocial: "Agroexport del Sur SRL",
    rubro: "Agroindustria",
    actividadPrimaria: "Exportación de granos",
    esCliente: true,
    estado: "ACTIVO",
    contactos: [{ nombre: "Carla Ibarra", rol: "Gerente Financiera", email: "carla@agroexport.com" }],
  },
  {
    cuit: "30709988771",
    razonSocial: "Textiles Andinos SA",
    rubro: "Textil",
    esCliente: true,
    estado: "ACTIVO",
    contactos: [{ nombre: "Diego Paz", rol: "Director", email: "dpaz@andinos.com.ar" }],
  },
  {
    cuit: "30711223344",
    razonSocial: "Constructora Río Cuarto SA",
    rubro: "Construcción",
    esCliente: true,
    estado: "ACTIVO",
    contactos: [{ nombre: "Verónica Luna", rol: "Administración", email: "vluna@riocuarto.com" }],
  },
  {
    cuit: "30688112233",
    razonSocial: "Farma Central SRL",
    rubro: "Salud",
    esCliente: true,
    estado: "OBSERVADO",
    contactos: [
      { nombre: "Pablo Herrera", rol: "Tesorero", email: "pherrera@farmacentral.com", telefono: "+541144001122" },
      { nombre: "Mariana Vega", rol: "CFO", email: "mvega@farmacentral.com", telefono: "+541144001133" },
      { nombre: "Santiago Ríos", rol: "Administración", email: "sdrios@farmacentral.com", whatsapp: "+541144001144" },
      { nombre: "Laura Méndez", rol: "Legales", email: "lmendez@farmacentral.com" },
    ],
  },
];

const proveedores: EmpresaSeed[] = [
  {
    cuit: "30501020304",
    razonSocial: "Banco Crecer SA",
    rubro: "Financiero",
    actividadPrimaria: "Factoring bancario",
    esProveedor: true,
    estado: "ACTIVO",
    costoA: 3.2,
    costoB: 3.8,
    costoC: 4.4,
    contactos: [
      { nombre: "Ana Sosa", rol: "Ejecutiva de cuenta", email: "ana.sosa@crecer.com.ar", telefono: "+541148001122" },
    ],
  },
  {
    cuit: "30712345098",
    razonSocial: "Fondo Pyme Capital SGR",
    rubro: "SGR",
    esProveedor: true,
    estado: "ACTIVO",
    costoA: 2.9,
    costoB: 3.4,
    costoC: 4.0,
    contactos: [{ nombre: "Rodrigo Méndez", rol: "Mesa de operaciones", email: "rodrigo@pymecapital.com" }],
  },
  {
    cuit: "30718998877",
    razonSocial: "Inversora del Plata SA",
    rubro: "Mercado de capitales",
    esProveedor: true,
    estado: "ACTIVO",
    costoA: 3.5,
    costoB: 4.1,
    costoC: 4.9,
    contactos: [{ nombre: "Silvina Ortiz", rol: "Trading", email: "sortiz@delplata.com" }],
  },
  {
    cuit: "30695544332",
    razonSocial: "ALyC Nexo Financiero",
    rubro: "ALyC",
    esProveedor: true,
    estado: "ACTIVO",
    costoA: 3.1,
    costoB: 3.7,
    costoC: 4.3,
    contactos: [{ nombre: "Julián Caro", rol: "Comercial", email: "jcaro@nexo.com.ar" }],
  },
];

const STATUSES = ["Pendiente", "Enviado", "Completado"] as const;

async function main() {
  console.log("🌱 Limpiando datos previos…");
  await prisma.etiquetaEmpresa.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.datoBancario.deleteMany();
  await prisma.nota.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.estadoMensual.deleteMany();
  await prisma.matrizCupo.deleteMany();
  await prisma.operacion.deleteMany();
  await prisma.pedidoCliente.deleteMany();
  await prisma.cupoProveedor.deleteMany();
  await prisma.contacto.deleteMany();
  await prisma.empresa.deleteMany();

  console.log("🏢 Creando empresas…");
  const createdClientes: { id: number; razonSocial: string }[] = [];
  const createdProveedores: { id: number; razonSocial: string }[] = [];

  for (const e of [...clientes, ...proveedores]) {
    const empresa = await prisma.empresa.create({
      data: {
        cuit: e.cuit,
        razonSocial: e.razonSocial,
        rubro: e.rubro,
        actividadPrimaria: e.actividadPrimaria,
        esCliente: !!e.esCliente,
        esProveedor: !!e.esProveedor,
        estado: e.estado,
        costoA: (e.costoA ?? +(2 + Math.random() * 3).toFixed(2)).toString(),
        costoB: (e.costoB ?? +(3 + Math.random() * 3).toFixed(2)).toString(),
        costoC: (e.costoC ?? +(4 + Math.random() * 3).toFixed(2)).toString(),
        percepciones: Math.floor(1 + Math.random() * 5),
        retenciones: Math.floor(1 + Math.random() * 5),
        costoAdicional: (+(0.5 + Math.random() * 1.5).toFixed(2)).toString(),
        observaciones:
          e.rubro === "Salud"
            ? "Cliente con seguimiento prioritario por nuevos productos."
            : "Empresa operativa. Contactos verificados y vigentes.",
        vigencia: "Hasta 12/2026",
        comprobante: "Factura A",
        updatedAt: new Date(
          Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
        ),
        contactos: {
          create: e.contactos.map((c) => ({
            ...c,
            updatedAt: new Date(
              Date.now() - Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000
            ),
          })),
        },
      },
    });
    if (e.esCliente) createdClientes.push({ id: empresa.id, razonSocial: empresa.razonSocial });
    if (e.esProveedor) createdProveedores.push({ id: empresa.id, razonSocial: empresa.razonSocial });
  }

  console.log("🏷️  Etiquetas…");
  const tagPremium = await prisma.etiqueta.create({ data: { nombre: "Premium", color: "#eab308" } });
  const tagNuevo = await prisma.etiqueta.create({ data: { nombre: "Nuevo", color: "#22c55e" } });
  const tagRevisar = await prisma.etiqueta.create({ data: { nombre: "Revisar", color: "#ef4444" } });
  await prisma.etiquetaEmpresa.createMany({
    data: [
      { empresaId: createdClientes[0].id, etiquetaId: tagPremium.id },
      { empresaId: createdClientes[1].id, etiquetaId: tagPremium.id },
      { empresaId: createdClientes[3].id, etiquetaId: tagNuevo.id },
      { empresaId: createdClientes[4].id, etiquetaId: tagRevisar.id },
      { empresaId: createdProveedores[0].id, etiquetaId: tagPremium.id },
    ],
  });

  console.log("🏦 Datos bancarios…");
  const BANCOS = [
    { banco: "Banco Galicia", prefix: "0070" },
    { banco: "Banco Santander", prefix: "0072" },
    { banco: "Banco BBVA", prefix: "0017" },
    { banco: "Banco Macro", prefix: "0285" },
    { banco: "Banco Nación", prefix: "0110" },
    { banco: "Banco ICBC", prefix: "0150" },
  ];

  for (const c of createdClientes) {
    const esFarma = c.razonSocial === "Farma Central SRL";
    const cantidad = esFarma ? 5 : 1;
    const aliasBase = c.razonSocial.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);

    for (let i = 0; i < cantidad; i++) {
      const b = BANCOS[i % BANCOS.length];
      await prisma.datoBancario.create({
        data: {
          empresaId: c.id,
          banco: b.banco,
          cbu: b.prefix + String(Math.floor(1e18 + Math.random() * 1e18)).slice(0, 18),
          alias: `${aliasBase}.${b.banco.split(" ")[1].toLowerCase().slice(0, 5)}`,
          titular: c.razonSocial,
          tipo: i % 2 === 0 ? "CUENTA_CORRIENTE" : "CAJA_AHORRO",
          updatedAt: new Date(
            Date.now() - Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000
          ),
        },
      });
    }
  }

  console.log("📅 Cupos / Pedidos / Operaciones (últimos 6 meses)…");
  const now = new Date();
  const periods: { anio: number; mes: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({ anio: d.getFullYear(), mes: d.getMonth() + 1 });
  }

  // Cupos por proveedor (1 entry por mes por proveedor)
  for (const p of createdProveedores) {
    for (const { anio, mes } of periods) {
      const importe = 20_000_000 + Math.floor(Math.random() * 40_000_000);
      const enviado = Math.floor(importe * (0.3 + Math.random() * 0.4));
      const pendiente = Math.floor((importe - enviado) * Math.random() * 0.5);
      const restante = importe - enviado - pendiente;
      await prisma.cupoProveedor.create({
        data: {
          empresaId: p.id,
          anio,
          mes,
          fecha: 1,
          importe: importe.toString(),
          cupoEnviado: enviado.toString(),
          cupoPendiente: pendiente.toString(),
          cupoRestante: restante.toString(),
          observaciones: "Cupo mensual asignado",
        },
      });
    }
  }

  // Pedidos por cliente (1 entry por mes por cliente)
  for (const c of createdClientes) {
    for (const { anio, mes } of periods) {
      const importe = 5_000_000 + Math.floor(Math.random() * 25_000_000);
      const restante = Math.floor(importe * Math.random() * 0.4);
      await prisma.pedidoCliente.create({
        data: {
          empresaId: c.id,
          anio,
          mes,
          fecha: 5,
          importe: importe.toString(),
          pedidoRestante: restante.toString(),
          observaciones: "Pedido de descuento mensual",
        },
      });
    }
  }

  // Matriz: tasa por par cliente-proveedor-mes
  for (const c of createdClientes) {
    for (const p of createdProveedores) {
      for (const { anio, mes } of periods) {
        await prisma.matrizCupo.create({
          data: {
            clienteId: c.id,
            proveedorId: p.id,
            anio,
            mes,
            tasa: (2.8 + Math.random() * 2.2).toFixed(2),
            monto: (1_000_000 + Math.random() * 9_000_000).toFixed(2),
          },
        });
      }
    }
  }

  // Operaciones: ~5 por mes aleatorias
  let opsCount = 0;
  for (const { anio, mes } of periods) {
    for (let i = 0; i < 6; i++) {
      const cliente = createdClientes[Math.floor(Math.random() * createdClientes.length)];
      const proveedor = createdProveedores[Math.floor(Math.random() * createdProveedores.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const dia = 1 + Math.floor(Math.random() * 27);
      const importe = 500_000 + Math.floor(Math.random() * 8_000_000);
      await prisma.operacion.create({
        data: {
          anio,
          mes,
          clienteId: cliente.id,
          proveedorId: proveedor.id,
          importe: importe.toString(),
          status,
          fecha: new Date(anio, mes - 1, dia),
          comentario: `Op ${cliente.razonSocial} → ${proveedor.razonSocial}`,
          clienteContacto: "Contacto cliente",
          proveedorContacto: "Contacto proveedor",
          fechaArmado: status !== "Pendiente" ? new Date(anio, mes - 1, dia) : null,
        },
      });
      opsCount++;
    }
  }

  // Estados mensuales
  for (const c of createdClientes) {
    for (const { anio, mes } of periods) {
      await prisma.estadoMensual.create({
        data: {
          empresaId: c.id,
          anio,
          mes,
          tipo: "CLIENTE",
          estado: Math.random() > 0.2 ? "OK" : "PENDIENTE",
          pedidoTotal: (10_000_000 + Math.random() * 15_000_000).toFixed(2),
        },
      });
    }
  }
  for (const p of createdProveedores) {
    for (const { anio, mes } of periods) {
      await prisma.estadoMensual.create({
        data: {
          empresaId: p.id,
          anio,
          mes,
          tipo: "PROVEEDOR",
          estado: "OK",
          cupoTotal: (30_000_000 + Math.random() * 30_000_000).toFixed(2),
          cupoRestante: (5_000_000 + Math.random() * 20_000_000).toFixed(2),
        },
      });
    }
  }

  // Notas
  for (const c of createdClientes) {
    await prisma.nota.create({
      data: {
        empresaId: c.id,
        tipo: "LLAMADA",
        texto: `Seguimiento mensual con ${c.razonSocial}. Confirmó pedido para el próximo período.`,
        usuario: "operador1",
      },
    });
  }

  console.log("🔍 Reindexando búsqueda…");
  const idxCount = await reindexAll();

  console.log(`✅ Seed completo:
  - SearchIndex entries: ${idxCount}
  - Empresas: ${createdClientes.length + createdProveedores.length} (${createdClientes.length} clientes, ${createdProveedores.length} proveedores)
  - Períodos: ${periods.length}
  - Operaciones: ${opsCount}
  - Cupos/Pedidos/Matriz/EstadosMensuales generados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
