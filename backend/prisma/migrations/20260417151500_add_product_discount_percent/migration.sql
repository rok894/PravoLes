-- AlterTable Product: add discountPercent (0-100). Validated in API.
ALTER TABLE "Product" ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;

-- Optional index to speed up filtering discounted products (not strictly needed).
-- CREATE INDEX "Product_discountPercent_idx" ON "Product"("discountPercent");
