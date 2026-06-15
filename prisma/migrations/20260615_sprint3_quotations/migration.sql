-- Drop old QuoteStatus enum values and Quotation table, recreate cleanly

-- Drop old table
DROP TABLE IF EXISTS "Quotation";

-- Drop old enum
DROP TYPE IF EXISTS "QuoteStatus";

-- Create new enum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ARCHIVED');

-- Create new Quotation table
CREATE TABLE "Quotation" (
    "id"                 TEXT NOT NULL,
    "number"             TEXT NOT NULL,
    "rateId"             TEXT,
    "createdById"        TEXT NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueDate"          TIMESTAMP(3) NOT NULL,
    "validUntil"         TIMESTAMP(3) NOT NULL,
    "status"             "QuoteStatus" NOT NULL DEFAULT 'DRAFT',

    "customerName"       TEXT NOT NULL,
    "customerEmail"      TEXT,
    "customerPhone"      TEXT,

    "originPort"         TEXT NOT NULL,
    "destinationPort"    TEXT NOT NULL,
    "originCountry"      TEXT NOT NULL,
    "destinationCountry" TEXT,
    "mode"               "ShipMode" NOT NULL,
    "incoterm"           TEXT NOT NULL,
    "currency"           TEXT NOT NULL DEFAULT 'USD',
    "cbm"                DECIMAL(10,3),
    "containers"         INTEGER,
    "grossWeightKg"      DECIMAL(10,2),
    "productDesc"        TEXT,
    "transitDaysMin"     INTEGER,
    "transitDaysMax"     INTEGER,
    "frequency"          TEXT,

    "intlCharges"        JSONB NOT NULL,
    "localCharges"       JSONB NOT NULL,
    "otherCharges"       JSONB NOT NULL,

    "intlTotal"          DECIMAL(10,2) NOT NULL,
    "localTotal"         DECIMAL(10,2) NOT NULL,
    "otherTotal"         DECIMAL(10,2) NOT NULL,
    "grandTotal"         DECIMAL(10,2) NOT NULL,

    "notes"              TEXT,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quotation_number_key" ON "Quotation"("number");
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
