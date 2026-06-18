ALTER TABLE "WhatsAppMessage" ADD COLUMN "phoneJid" TEXT;
ALTER TABLE "WaConversation" ADD COLUMN "phoneJid" TEXT;

CREATE INDEX "WhatsAppMessage_phoneJid_idx" ON "WhatsAppMessage"("phoneJid");
