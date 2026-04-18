-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "SearchIndex" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "empresaId" INTEGER,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tsv" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('spanish', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('spanish', coalesce("subtitle", '')), 'B') ||
      setweight(to_tsvector('spanish', coalesce("body", '')), 'C')
    ) STORED,

    CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchIndex_empresaId_idx" ON "SearchIndex"("empresaId");

-- CreateIndex
CREATE INDEX "SearchIndex_entityType_idx" ON "SearchIndex"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "SearchIndex_entityType_entityId_key" ON "SearchIndex"("entityType", "entityId");

-- Full-text search index (GIN on tsvector)
CREATE INDEX "SearchIndex_tsv_idx" ON "SearchIndex" USING GIN ("tsv");

-- Fuzzy / typo-tolerant index (GIN trigram on title)
CREATE INDEX "SearchIndex_title_trgm_idx" ON "SearchIndex" USING GIN ("title" gin_trgm_ops);
