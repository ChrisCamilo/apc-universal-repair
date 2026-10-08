-- Items point at their lists: the category, part brand, vehicle brand and vehicle model become references instead of
-- names, and position and side become enums. The names items use are matched to their list entries by key (as
-- optionKey in @apc/shared/items writes it); a name no list holds yet is added first.

-- The name key, for the names items hold.
CREATE FUNCTION pg_temp.list_key(name TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g')),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  )
$$;

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('NA', 'FRONT', 'REAR', 'BOTH');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('NA', 'RIGHT', 'LEFT', 'BOTH');

-- The names items use that their lists don't hold yet, each once, in the spelling most items use.
INSERT INTO "Category" ("id", "name", "nameKey")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY "category"), pg_temp.list_key("category") FROM "Item" GROUP BY 3
ON CONFLICT DO NOTHING;

INSERT INTO "PartBrand" ("id", "name", "nameKey")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY "partBrand"), pg_temp.list_key("partBrand") FROM "Item" GROUP BY 3
ON CONFLICT DO NOTHING;

INSERT INTO "Brand" ("id", "name", "nameKey")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY "vehicleBrand"), pg_temp.list_key("vehicleBrand") FROM "Item" GROUP BY 3
ON CONFLICT DO NOTHING;

INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY item."vehicleModel"), pg_temp.list_key(item."vehicleModel"), brand."id"
FROM "Item" item JOIN "Brand" brand ON brand."nameKey" = pg_temp.list_key(item."vehicleBrand")
WHERE item."vehicleModel" IS NOT NULL
GROUP BY 3, 4
ON CONFLICT DO NOTHING;

-- AlterTable: the references, filled from the names, then required.
ALTER TABLE "Item" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "partBrandId" TEXT,
ADD COLUMN "vehicleBrandId" TEXT,
ADD COLUMN "vehicleModelId" TEXT;

UPDATE "Item" item SET "categoryId" = list."id" FROM "Category" list WHERE list."nameKey" = pg_temp.list_key(item."category");
UPDATE "Item" item SET "partBrandId" = list."id" FROM "PartBrand" list WHERE list."nameKey" = pg_temp.list_key(item."partBrand");
UPDATE "Item" item SET "vehicleBrandId" = list."id" FROM "Brand" list WHERE list."nameKey" = pg_temp.list_key(item."vehicleBrand");
UPDATE "Item" item SET "vehicleModelId" = list."id" FROM "VehicleModel" list
WHERE list."brandId" = item."vehicleBrandId" AND list."nameKey" = pg_temp.list_key(item."vehicleModel");

ALTER TABLE "Item" ALTER COLUMN "categoryId" SET NOT NULL,
ALTER COLUMN "partBrandId" SET NOT NULL,
ALTER COLUMN "vehicleBrandId" SET NOT NULL,
DROP COLUMN "category",
DROP COLUMN "partBrand",
DROP COLUMN "vehicleBrand",
DROP COLUMN "vehicleModel";

-- AlterTable: position and side as enums, from the values the API writes.
ALTER TABLE "Item" ALTER COLUMN "position" DROP DEFAULT,
ALTER COLUMN "position" TYPE "Position" USING (
  CASE "position" WHEN 'D' THEN 'FRONT' WHEN 'T' THEN 'REAR' WHEN 'Ambos' THEN 'BOTH' ELSE 'NA' END
)::"Position",
ALTER COLUMN "position" SET DEFAULT 'NA',
ALTER COLUMN "side" DROP DEFAULT,
ALTER COLUMN "side" TYPE "Side" USING (
  CASE "side" WHEN 'LD' THEN 'RIGHT' WHEN 'LE' THEN 'LEFT' WHEN 'Ambos' THEN 'BOTH' ELSE 'NA' END
)::"Side",
ALTER COLUMN "side" SET DEFAULT 'NA';

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_partBrandId_idx" ON "Item"("partBrandId");

-- CreateIndex
CREATE INDEX "Item_vehicleBrandId_idx" ON "Item"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "Item_vehicleModelId_idx" ON "Item"("vehicleModelId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_partBrandId_fkey" FOREIGN KEY ("partBrandId") REFERENCES "PartBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
