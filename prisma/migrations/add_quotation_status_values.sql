-- Migration: replace QuoteStatus enum values with the new status pipeline
-- Adds: BORRADOR, ENVIADA, APROBADA, EN_TRANSITO, ARRIBO, EN_ADUANA, NACIONALIZACION, ENTREGADA, RECHAZADA
-- Removes: DRAFT, SENT, ARCHIVED (migrate existing data first)

-- Step 1: Migrate existing data to new enum values
UPDATE "Quotation"
SET status = 'BORRADOR'
WHERE status = 'DRAFT';

UPDATE "Quotation"
SET status = 'ENVIADA'
WHERE status = 'SENT';

UPDATE "Quotation"
SET status = 'BORRADOR'
WHERE status = 'ARCHIVED';

-- Step 2: Rename old enum
ALTER TYPE "QuoteStatus" RENAME TO "QuoteStatus_old";

-- Step 3: Create new enum
CREATE TYPE "QuoteStatus" AS ENUM (
  'BORRADOR',
  'ENVIADA',
  'APROBADA',
  'EN_TRANSITO',
  'ARRIBO',
  'EN_ADUANA',
  'NACIONALIZACION',
  'ENTREGADA',
  'RECHAZADA'
);

-- Step 4: Update the column to use new enum type
ALTER TABLE "Quotation"
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "QuoteStatus" USING status::text::"QuoteStatus",
  ALTER COLUMN status SET DEFAULT 'BORRADOR';

-- Step 5: Drop old enum
DROP TYPE "QuoteStatus_old";
