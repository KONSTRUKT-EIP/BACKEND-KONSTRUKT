-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_siteZoneId_fkey";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "time" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_siteZoneId_fkey" FOREIGN KEY ("siteZoneId") REFERENCES "SiteZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
