-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN     "email" TEXT,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER,
    "mime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "usuario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatoBancario" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "banco" TEXT NOT NULL,
    "cbu" TEXT NOT NULL,
    "alias" TEXT,
    "titular" TEXT,
    "tipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatoBancario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtiquetaEmpresa" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "etiquetaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtiquetaEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Documento_empresaId_idx" ON "Documento"("empresaId");

-- CreateIndex
CREATE INDEX "Nota_empresaId_idx" ON "Nota"("empresaId");

-- CreateIndex
CREATE INDEX "Nota_createdAt_idx" ON "Nota"("createdAt");

-- CreateIndex
CREATE INDEX "DatoBancario_empresaId_idx" ON "DatoBancario"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nombre_key" ON "Etiqueta"("nombre");

-- CreateIndex
CREATE INDEX "EtiquetaEmpresa_empresaId_idx" ON "EtiquetaEmpresa"("empresaId");

-- CreateIndex
CREATE INDEX "EtiquetaEmpresa_etiquetaId_idx" ON "EtiquetaEmpresa"("etiquetaId");

-- CreateIndex
CREATE UNIQUE INDEX "EtiquetaEmpresa_empresaId_etiquetaId_key" ON "EtiquetaEmpresa"("empresaId", "etiquetaId");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatoBancario" ADD CONSTRAINT "DatoBancario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtiquetaEmpresa" ADD CONSTRAINT "EtiquetaEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtiquetaEmpresa" ADD CONSTRAINT "EtiquetaEmpresa_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
