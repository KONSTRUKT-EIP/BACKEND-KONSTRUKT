/*
  Warnings:

  - You are about to drop the `SiteImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "SiteImage" DROP CONSTRAINT "SiteImage_siteId_fkey";

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "organizationId" DROP NOT NULL;

-- DropTable
DROP TABLE "SiteImage";

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
