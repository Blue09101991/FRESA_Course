-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- Make username required (if it doesn't exist, set a default)
UPDATE "User" SET "username" = LOWER(REPLACE("email", '@', '_')) WHERE "username" IS NULL;

-- AlterTable: Make username NOT NULL
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- AlterTable: Make name NOT NULL (if it was nullable)
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
