-- AlterTable
ALTER TABLE "Operacion" ADD COLUMN     "clienteEnviado" TEXT,
ADD COLUMN     "comentario" TEXT,
ADD COLUMN     "fechaArmado" TIMESTAMP(3),
ADD COLUMN     "proveedorRecibido" TEXT;
