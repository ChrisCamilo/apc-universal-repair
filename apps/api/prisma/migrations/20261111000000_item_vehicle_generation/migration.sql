-- A vehicle of an item may say its generation, by its first and last year, and its version; items from before have
-- neither.

-- AlterTable
ALTER TABLE "ItemVehicle" ADD COLUMN "firstYear" INTEGER,
ADD COLUMN "lastYear" INTEGER,
ADD COLUMN "version" TEXT;
