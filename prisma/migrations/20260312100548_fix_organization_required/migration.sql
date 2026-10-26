/*
  Warnings:

  - Made the column `organizationId` on table `Site` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_organizationId_fkey";

-- Delete sites with NULL organizationId before making the column required
DELETE FROM "Site" WHERE "organizationId" IS NULL;

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
