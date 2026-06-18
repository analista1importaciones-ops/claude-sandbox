CREATE TYPE "ServiceInvoiceStatus" AS ENUM ('BORRADOR', 'EMITIDA', 'PAGADA', 'ANULADA');

CREATE TABLE "ServiceInvoice" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "status" "ServiceInvoiceStatus" NOT NULL DEFAULT 'EMITIDA',
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "customerTaxId" TEXT,
  "customerAddress" TEXT,
  "serviceTag" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "items" JSONB NOT NULL,
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "ivaTotal" DECIMAL(12, 2) NOT NULL,
  "total" DECIMAL(12, 2) NOT NULL,
  "notes" TEXT,
  CONSTRAINT "ServiceInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceInvoice_number_key" ON "ServiceInvoice"("number");

ALTER TABLE "ServiceInvoice"
  ADD CONSTRAINT "ServiceInvoice_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
