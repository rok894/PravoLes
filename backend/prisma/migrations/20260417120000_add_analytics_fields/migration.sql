-- AlterTable Visit: add sessionId, device, country
ALTER TABLE "Visit" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Visit" ADD COLUMN "device" TEXT;
ALTER TABLE "Visit" ADD COLUMN "country" TEXT;

-- CreateIndex
CREATE INDEX "Visit_sessionId_idx" ON "Visit"("sessionId");

-- AlterTable Cart: add sessionId, source, checkoutStartedAt
ALTER TABLE "Cart" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Cart" ADD COLUMN "source" TEXT;
ALTER TABLE "Cart" ADD COLUMN "checkoutStartedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Cart_sessionId_idx" ON "Cart"("sessionId");
CREATE INDEX "Cart_source_idx" ON "Cart"("source");
