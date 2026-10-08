-- The lists the item form picks from: categories, part brands, vehicle brands (the Brand table, given a name key)
-- and vehicle models, each name unique by its key: lowercase, without accents or extra spaces, as optionKey in
-- @apc/shared/items writes it. They start with what the items in stock already use.

-- The name key, for the names already saved.
CREATE FUNCTION pg_temp.list_key(name TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g')),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  )
$$;

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "nameKey" TEXT;
UPDATE "Brand" SET "nameKey" = pg_temp.list_key("name");
ALTER TABLE "Brand" ALTER COLUMN "nameKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,

    CONSTRAINT "PartBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nameKey_key" ON "Category"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartBrand_nameKey_key" ON "PartBrand"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_brandId_nameKey_key" ON "VehicleModel"("brandId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_nameKey_key" ON "Brand"("nameKey");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The names the items use, each once, in the spelling most items use.
INSERT INTO "Category" ("id", "name", "nameKey")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY "category"), pg_temp.list_key("category") FROM "Item" GROUP BY 3;

INSERT INTO "PartBrand" ("id", "name", "nameKey")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY "partBrand"), pg_temp.list_key("partBrand") FROM "Item" GROUP BY 3;

INSERT INTO "Brand" ("id", "name", "nameKey")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY "vehicleBrand"), pg_temp.list_key("vehicleBrand") FROM "Item" GROUP BY 3
ON CONFLICT DO NOTHING;

INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId")
SELECT gen_random_uuid()::text, mode() WITHIN GROUP (ORDER BY item."vehicleModel"), pg_temp.list_key(item."vehicleModel"), brand."id"
FROM "Item" item JOIN "Brand" brand ON brand."nameKey" = pg_temp.list_key(item."vehicleBrand")
WHERE item."vehicleModel" IS NOT NULL
GROUP BY 3, 4;
