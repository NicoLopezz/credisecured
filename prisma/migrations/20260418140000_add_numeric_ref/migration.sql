-- CreateTable
CREATE TABLE "NumericRef" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "empresaId" INTEGER,
    "kind" TEXT NOT NULL,
    "digits" TEXT NOT NULL,
    "raw" TEXT NOT NULL,

    CONSTRAINT "NumericRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NumericRef_entityType_entityId_idx" ON "NumericRef"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NumericRef_kind_idx" ON "NumericRef"("kind");

-- CreateIndex
CREATE INDEX "NumericRef_empresaId_idx" ON "NumericRef"("empresaId");

-- Prefix search (B-tree con text_pattern_ops → O(log n) para LIKE 'prefix%')
CREATE INDEX "NumericRef_digits_prefix_idx" ON "NumericRef"("digits" text_pattern_ops);

-- Substring anywhere (GIN trigram)
CREATE INDEX "NumericRef_digits_trgm_idx" ON "NumericRef" USING GIN ("digits" gin_trgm_ops);
