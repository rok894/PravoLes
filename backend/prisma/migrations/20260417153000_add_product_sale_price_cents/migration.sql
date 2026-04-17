-- AlterTable Product: add salePriceCents (explicit discounted price).
ALTER TABLE "Product" ADD COLUMN "salePriceCents" INTEGER;

-- Backfill from discountPercent for existing rows (keep 1 cent minimum).
UPDATE "Product"
SET "salePriceCents" = CASE
  WHEN "discountPercent" IS NULL OR "discountPercent" <= 0 THEN NULL
  ELSE MAX(1, ROUND(("priceCents" * (100 - "discountPercent")) / 100.0))
END;
