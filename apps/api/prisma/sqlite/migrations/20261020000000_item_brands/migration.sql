-- An item holds the brands that make its part (ItemBrand), each with its own code, color, location, quantity, price
-- and photos. Each item from before becomes an item with one brand, which takes the item's id, so its photos move to
-- it by the same id; the item's quantity stays, as the sum of its one brand's.
--
-- SQLite drops columns by rebuilding the table, and the migration runs in a transaction, where foreign keys can't be
-- turned off: dropping the old Item would delete the rows that reference it (ON DELETE CASCADE). So the brands' and
-- the photos' data is set aside first, in tables without constraints, the photos' and the items' tables are rebuilt
-- with nothing referencing them, and the brands and photos are written back from what was set aside.

-- What each item's brand takes from its row, and its photos with the brand they move to.
CREATE TABLE "_ItemBrand_data" AS
SELECT "id", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt"
FROM "Item";
CREATE TABLE "_ItemPhoto_data" AS
SELECT "id", "itemId" AS "brandId", "position", "file", "thumbFile"
FROM "ItemPhoto";

-- The photos' table goes first, so dropping the items' deletes nothing else.
DROP TABLE "ItemPhoto";

-- RedefineTables
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vehicleBrandId" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    "position" TEXT NOT NULL DEFAULT 'NA',
    "side" TEXT NOT NULL DEFAULT 'NA',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("categoryId", "createdAt", "id", "minQuantity", "name", "nameKey", "position", "quantity", "side", "updatedAt", "vehicleBrandId", "vehicleModelId") SELECT "categoryId", "createdAt", "id", "minQuantity", "name", "nameKey", "position", "quantity", "side", "updatedAt", "vehicleBrandId", "vehicleModelId" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
CREATE INDEX "Item_vehicleBrandId_idx" ON "Item"("vehicleBrandId");
CREATE INDEX "Item_vehicleModelId_idx" ON "Item"("vehicleModelId");

-- CreateTable
CREATE TABLE "ItemBrand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
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
INSERT INTO "ItemBrand" ("id", "itemId", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt")
SELECT "id", "id", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt"
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

DROP TABLE "_ItemBrand_data";
DROP TABLE "_ItemPhoto_data";

-- CreateIndex
CREATE UNIQUE INDEX "ItemPhoto_brandId_position_key" ON "ItemPhoto"("brandId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ItemBrand_code_key" ON "ItemBrand"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ItemBrand_codeKey_key" ON "ItemBrand"("codeKey");

-- CreateIndex
CREATE INDEX "ItemBrand_partBrandId_idx" ON "ItemBrand"("partBrandId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemBrand_itemId_partBrandId_key" ON "ItemBrand"("itemId", "partBrandId");
