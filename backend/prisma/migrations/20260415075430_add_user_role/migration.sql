-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "failedLoginAttempts", "id", "lockedUntil", "passwordHash", "updatedAt") SELECT "createdAt", "email", "failedLoginAttempts", "id", "lockedUntil", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Bootstrap initial admin role
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'rok.otolani@gmail.com';
