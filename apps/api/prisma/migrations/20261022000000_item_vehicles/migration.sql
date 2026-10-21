-- An item fits a list of vehicles (ItemVehicle), each a vehicle brand and, optionally, one of its models. Each item
-- from before becomes an item of one vehicle, its brand and model as they were, which takes the item's id.

-- CreateTable
CREATE TABLE "ItemVehicle" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "vehicleBrandId" TEXT NOT NULL,
    "vehicleModelId" TEXT,

    CONSTRAINT "ItemVehicle_pkey" PRIMARY KEY ("id")
);

-- Each item's vehicle, from its own columns.
INSERT INTO "ItemVehicle" ("id", "itemId", "position", "vehicleBrandId", "vehicleModelId")
SELECT "id", "id", 0, "vehicleBrandId", "vehicleModelId"
FROM "Item";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_vehicleBrandId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_vehicleModelId_fkey";

-- DropIndex
DROP INDEX "Item_vehicleBrandId_idx";

-- DropIndex
DROP INDEX "Item_vehicleModelId_idx";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "vehicleBrandId",
DROP COLUMN "vehicleModelId";

-- CreateIndex
CREATE INDEX "ItemVehicle_itemId_idx" ON "ItemVehicle"("itemId");

-- CreateIndex
CREATE INDEX "ItemVehicle_vehicleBrandId_idx" ON "ItemVehicle"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "ItemVehicle_vehicleModelId_idx" ON "ItemVehicle"("vehicleModelId");

-- AddForeignKey
ALTER TABLE "ItemVehicle" ADD CONSTRAINT "ItemVehicle_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVehicle" ADD CONSTRAINT "ItemVehicle_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVehicle" ADD CONSTRAINT "ItemVehicle_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
