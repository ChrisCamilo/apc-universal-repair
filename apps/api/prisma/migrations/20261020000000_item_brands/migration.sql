-- An item holds the brands that make its part (ItemBrand), each with its own code, color, location, quantity, price
-- and photos. Each item from before becomes an item with one brand, which takes the item's id, so its photos move to
-- it by the same id; the item's quantity stays, as the sum of its one brand's.

-- CreateTable
CREATE TABLE "ItemBrand" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "partBrandId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'N/A',
    "location" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemBrand_pkey" PRIMARY KEY ("id")
);

-- Each item's brand, from its own columns.
INSERT INTO "ItemBrand" ("id", "itemId", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt")
SELECT "id", "id", "partBrandId", "code", "codeKey", "color", "location", "quantity", "unitPriceCents", "createdAt", "updatedAt"
FROM "Item";

-- The photos move to the brand, which has the item's id.
ALTER TABLE "ItemPhoto" ADD COLUMN "brandId" TEXT;
UPDATE "ItemPhoto" SET "brandId" = "itemId";
ALTER TABLE "ItemPhoto" ALTER COLUMN "brandId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_partBrandId_fkey";

-- DropForeignKey
ALTER TABLE "ItemPhoto" DROP CONSTRAINT "ItemPhoto_itemId_fkey";

-- DropIndex
DROP INDEX "Item_code_key";

-- DropIndex
DROP INDEX "Item_codeKey_key";

-- DropIndex
DROP INDEX "Item_partBrandId_idx";

-- DropIndex
DROP INDEX "ItemPhoto_itemId_position_key";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "code",
DROP COLUMN "codeKey",
DROP COLUMN "color",
DROP COLUMN "location",
DROP COLUMN "partBrandId",
DROP COLUMN "unitPriceCents";

-- AlterTable
ALTER TABLE "ItemPhoto" DROP COLUMN "itemId";

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

-- AddForeignKey
ALTER TABLE "ItemBrand" ADD CONSTRAINT "ItemBrand_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemBrand" ADD CONSTRAINT "ItemBrand_partBrandId_fkey" FOREIGN KEY ("partBrandId") REFERENCES "PartBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPhoto" ADD CONSTRAINT "ItemPhoto_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ItemBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
