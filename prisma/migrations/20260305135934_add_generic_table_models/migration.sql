-- CreateTable
CREATE TABLE "GenericTable" (
    "id" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenericTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenericTableRow" (
    "id" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenericTableRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenericTable_siteId_idx" ON "GenericTable"("siteId");

-- CreateIndex
CREATE INDEX "GenericTableRow_tableId_idx" ON "GenericTableRow"("tableId");

-- AddForeignKey
ALTER TABLE "GenericTable" ADD CONSTRAINT "GenericTable_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenericTableRow" ADD CONSTRAINT "GenericTableRow_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "GenericTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
