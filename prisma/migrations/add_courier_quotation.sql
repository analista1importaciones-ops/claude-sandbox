-- CreateEnum
CREATE TYPE "CourierStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'EN_TRANSITO', 'ENTREGADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "CourierQuotation" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "weightKg" DECIMAL(10,3) NOT NULL,
    "lengthCm" DECIMAL(10,1),
    "widthCm" DECIMAL(10,1),
    "heightCm" DECIMAL(10,1),
    "volumetricWeightKg" DECIMAL(10,3),
    "chargeableWeightKg" DECIMAL(10,3),
    "productDesc" TEXT,
    "declaredValueUsd" DECIMAL(12,2),
    "options" JSONB NOT NULL DEFAULT '[]',
    "selectedCarrier" TEXT,
    "selectedService" TEXT,
    "selectedPriceUsd" DECIMAL(10,2),
    "status" "CourierStatus" NOT NULL DEFAULT 'BORRADOR',
    "notes" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierQuotation_number_key" ON "CourierQuotation"("number");

-- AddForeignKey
ALTER TABLE "CourierQuotation" ADD CONSTRAINT "CourierQuotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
