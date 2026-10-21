-- An item fits a list of vehicles (ItemVehicle), each a vehicle brand and, optionally, one of its models. Each item
-- from before becomes an item of one vehicle, its brand and model as they were, which takes the item's id.
--
-- SQLite drops columns by rebuilding the table, and the migration runs in a transaction, where foreign keys can't be
-- turned off: dropping the old Item would delete the rows that reference it (ON DELETE CASCADE). So the vehicles, the
-- brands, the photos and the original codes are set aside first, in tables without constraints, the tables that
-- reference the items are dropped (the photos first, which reference the brands), the items' table is rebuilt with
-- nothing referencing it, and every table is written back from what was set aside.

-- What each item's vehicle takes from its row, and the rows that reference the items, as they are.
CREATE TABLE "_ItemVehicle_data" AS
SELECT "id", "vehicleBrandId", "vehicleModelId"
FROM "Item";
CREATE TABLE "_ItemBrand_data" AS
SELECT "id", "itemId", "position", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt"
FROM "ItemBrand";
CREATE TABLE "_ItemPhoto_data" AS
SELECT "id", "brandId", "position", "file", "thumbFile"
FROM "ItemPhoto";
CREATE TABLE "_ItemOriginalCode_data" AS
SELECT "id", "itemId", "position", "code", "codeKey"
FROM "ItemOriginalCode";

-- The photos go first, then the brands and the original codes, so dropping the items' table deletes nothing else.
DROP TABLE "ItemPhoto";
DROP TABLE "ItemBrand";
DROP TABLE "ItemOriginalCode";

-- RedefineTables
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'NA',
    "side" TEXT NOT NULL DEFAULT 'NA',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("categoryId", "createdAt", "id", "minQuantity", "name", "nameKey", "position", "quantity", "side", "updatedAt") SELECT "categoryId", "createdAt", "id", "minQuantity", "name", "nameKey", "position", "quantity", "side", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateTable
CREATE TABLE "ItemVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "vehicleBrandId" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    CONSTRAINT "ItemVehicle_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemVehicle_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemVehicle_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "ItemVehicle" ("id", "itemId", "position", "vehicleBrandId", "vehicleModelId")
SELECT "id", "id", 0, "vehicleBrandId", "vehicleModelId"
FROM "_ItemVehicle_data";

-- CreateTable
CREATE TABLE "ItemBrand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "partBrandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'N/A',
    "location" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItemBrand_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemBrand_partBrandId_fkey" FOREIGN KEY ("partBrandId") REFERENCES "PartBrand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "ItemBrand" ("id", "itemId", "position", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt")
SELECT "id", "itemId", "position", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt"
FROM "_ItemBrand_data";

-- CreateTable
CREATE TABLE "ItemPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "file" TEXT NOT NULL,
    "thumbFile" TEXT NOT NULL,
    CONSTRAINT "ItemPhoto_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ItemBrand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "ItemPhoto" ("id", "brandId", "position", "file", "thumbFile")
SELECT "id", "brandId", "position", "file", "thumbFile"
FROM "_ItemPhoto_data";

-- CreateTable
CREATE TABLE "ItemOriginalCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    CONSTRAINT "ItemOriginalCode_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "ItemOriginalCode" ("id", "itemId", "position", "code", "codeKey")
SELECT "id", "itemId", "position", "code", "codeKey"
FROM "_ItemOriginalCode_data";

DROP TABLE "_ItemVehicle_data";
DROP TABLE "_ItemBrand_data";
DROP TABLE "_ItemPhoto_data";
DROP TABLE "_ItemOriginalCode_data";

-- CreateIndex
CREATE INDEX "ItemVehicle_itemId_idx" ON "ItemVehicle"("itemId");

-- CreateIndex
CREATE INDEX "ItemVehicle_vehicleBrandId_idx" ON "ItemVehicle"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "ItemVehicle_vehicleModelId_idx" ON "ItemVehicle"("vehicleModelId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemBrand_code_key" ON "ItemBrand"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ItemBrand_codeKey_key" ON "ItemBrand"("codeKey");

-- CreateIndex
CREATE INDEX "ItemBrand_partBrandId_idx" ON "ItemBrand"("partBrandId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemBrand_itemId_partBrandId_key" ON "ItemBrand"("itemId", "partBrandId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPhoto_brandId_position_key" ON "ItemPhoto"("brandId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOriginalCode_code_key" ON "ItemOriginalCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOriginalCode_codeKey_key" ON "ItemOriginalCode"("codeKey");

-- CreateIndex
CREATE INDEX "ItemOriginalCode_itemId_idx" ON "ItemOriginalCode"("itemId");
