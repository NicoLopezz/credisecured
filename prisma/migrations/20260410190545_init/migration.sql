-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "cuit" TEXT NOT NULL,
    "comprobante" TEXT,
    "razonSocial" TEXT NOT NULL,
    "nombreWhatsapp" TEXT,
    "actividadPrimaria" TEXT,
    "actividadSecundaria" TEXT,
    "otrasActividades" TEXT,
    "rubro" TEXT,
    "observaciones" TEXT,
    "comentarios" TEXT,
    "vigencia" TEXT,
    "estado" TEXT,
    "esCliente" BOOLEAN NOT NULL DEFAULT false,
    "esProveedor" BOOLEAN NOT NULL DEFAULT false,
    "costoA" DECIMAL(20,2),
    "costoB" DECIMAL(20,2),
    "costoC" DECIMAL(20,2),
    "percepciones" INTEGER,
    "retenciones" INTEGER,
    "costoAdicional" DECIMAL(20,2),
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contacto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT,
    "empresaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CupoProveedor" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "fecha" INTEGER NOT NULL,
    "importe" DECIMAL(20,2) NOT NULL,
    "cupoRestante" DECIMAL(20,2) NOT NULL,
    "cupoPendiente" DECIMAL(20,2) NOT NULL,
    "cupoEnviado" DECIMAL(20,2) NOT NULL,
    "observaciones" TEXT,
    "contacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CupoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCliente" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "fecha" INTEGER NOT NULL,
    "importe" DECIMAL(20,2) NOT NULL,
    "pedidoRestante" DECIMAL(20,2) NOT NULL,
    "observaciones" TEXT,
    "contacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operacion" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "importe" DECIMAL(20,2) NOT NULL,
    "status" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "clienteContacto" TEXT,
    "proveedorContacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatrizCupo" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "tasa" DECIMAL(20,2),
    "monto" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrizCupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoMensual" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "pedidoTotal" DECIMAL(20,2),
    "cupoTotal" DECIMAL(20,2),
    "cupoRestante" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cuit_key" ON "Empresa"("cuit");

-- CreateIndex
CREATE INDEX "Contacto_empresaId_idx" ON "Contacto"("empresaId");

-- CreateIndex
CREATE INDEX "CupoProveedor_empresaId_idx" ON "CupoProveedor"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CupoProveedor_empresaId_anio_mes_fecha_key" ON "CupoProveedor"("empresaId", "anio", "mes", "fecha");

-- CreateIndex
CREATE INDEX "PedidoCliente_empresaId_idx" ON "PedidoCliente"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCliente_empresaId_anio_mes_fecha_key" ON "PedidoCliente"("empresaId", "anio", "mes", "fecha");

-- CreateIndex
CREATE INDEX "Operacion_clienteId_idx" ON "Operacion"("clienteId");

-- CreateIndex
CREATE INDEX "Operacion_proveedorId_idx" ON "Operacion"("proveedorId");

-- CreateIndex
CREATE INDEX "MatrizCupo_clienteId_idx" ON "MatrizCupo"("clienteId");

-- CreateIndex
CREATE INDEX "MatrizCupo_proveedorId_idx" ON "MatrizCupo"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "MatrizCupo_clienteId_proveedorId_anio_mes_key" ON "MatrizCupo"("clienteId", "proveedorId", "anio", "mes");

-- CreateIndex
CREATE INDEX "EstadoMensual_empresaId_idx" ON "EstadoMensual"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoMensual_empresaId_anio_mes_tipo_key" ON "EstadoMensual"("empresaId", "anio", "mes", "tipo");

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupoProveedor" ADD CONSTRAINT "CupoProveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCliente" ADD CONSTRAINT "PedidoCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operacion" ADD CONSTRAINT "Operacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operacion" ADD CONSTRAINT "Operacion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizCupo" ADD CONSTRAINT "MatrizCupo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrizCupo" ADD CONSTRAINT "MatrizCupo_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoMensual" ADD CONSTRAINT "EstadoMensual_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
