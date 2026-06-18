ALTER TABLE "ServiceInvoice" ADD COLUMN "contactId" TEXT;

ALTER TABLE "ServiceInvoice"
  ADD CONSTRAINT "ServiceInvoice_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ServiceInvoice_contactId_idx" ON "ServiceInvoice"("contactId");
