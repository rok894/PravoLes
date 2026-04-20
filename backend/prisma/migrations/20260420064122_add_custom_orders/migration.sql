-- CreateTable
CREATE TABLE "CustomOrderRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "description" TEXT NOT NULL,
    "dimensions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "quotePriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "quoteMessage" TEXT,
    "adminNotes" TEXT,
    "quotedAt" DATETIME,
    "acceptedAt" DATETIME,
    "paidAt" DATETIME,
    "rejectedAt" DATETIME,
    "canceledAt" DATETIME,
    CONSTRAINT "CustomOrderRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomOrderImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    CONSTRAINT "CustomOrderImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CustomOrderRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUIRES_ACTION',
    "orderId" TEXT,
    "customOrderId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrderRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("createdAt", "id", "orderId", "status", "stripeCustomerId", "stripePaymentIntentId", "stripeSessionId", "updatedAt") SELECT "createdAt", "id", "orderId", "status", "stripeCustomerId", "stripePaymentIntentId", "stripeSessionId", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
CREATE UNIQUE INDEX "Payment_customOrderId_key" ON "Payment"("customOrderId");
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomOrderRequest_status_idx" ON "CustomOrderRequest"("status");

-- CreateIndex
CREATE INDEX "CustomOrderRequest_userId_idx" ON "CustomOrderRequest"("userId");

-- CreateIndex
CREATE INDEX "CustomOrderRequest_email_idx" ON "CustomOrderRequest"("email");

-- CreateIndex
CREATE INDEX "CustomOrderImage_requestId_idx" ON "CustomOrderImage"("requestId");
