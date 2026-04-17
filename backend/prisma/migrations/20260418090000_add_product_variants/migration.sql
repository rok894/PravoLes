-- CreateTable ProductVariant
CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "productId" TEXT NOT NULL,
  "color" TEXT,
  "size" TEXT,
  "wood" TEXT,
  "priceCents" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProductVariant_productId_color_size_wood_key" ON "ProductVariant"("productId", "color", "size", "wood");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- AlterTable CartItem: add variantId + redefine unique index (SQLite requires table rebuild for unique change)
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_CartItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "cartId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CartItem" ("id", "createdAt", "updatedAt", "cartId", "productId", "qty")
  SELECT "id", "createdAt", "updatedAt", "cartId", "productId", "qty" FROM "CartItem";
DROP TABLE "CartItem";
ALTER TABLE "new_CartItem" RENAME TO "CartItem";
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key" ON "CartItem"("cartId", "productId", "variantId");
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;

-- AlterTable OrderItem: add variant snapshot columns
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD COLUMN "variantColor" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantSize" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantWood" TEXT;
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
