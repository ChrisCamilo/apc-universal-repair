-- An item's vehicle points at the catalog's generation and version instead of keeping years and a version of its own,
-- so the catalog and the stock hold one and the same: a generation's years or a version's name changed in the Catalog
-- show on every item, and one an item uses can't be deleted. The vehicles saved before are linked here:
-- 1. the catalog brands, models, generations (named by their years) and versions the saved vehicles name and the
--    Catalog doesn't have are added to it, at the end of their siblings;
-- 2. each vehicle with a generation is linked to it, and to its version, matched ignoring case;
-- 3. a version saved without a generation is linked to the one version of that name the model has in the Catalog;
-- 4. a version still unlinked goes to its item's short description, so nothing is lost.
-- A version now always belongs to a generation.

-- AlterTable
ALTER TABLE "ItemVehicle" ADD COLUMN "generationId" TEXT, ADD COLUMN "versionId" TEXT;

-- The catalog brands of the vehicles with a generation, with their letters (brandMark: the first letters of the first
-- two words, or the first two letters).
INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position")
SELECT gen_random_uuid()::text, b."id",
  CASE WHEN position(' ' IN trim(b."name")) > 0
    THEN upper(substr(trim(b."name"), 1, 1) || substr(trim(b."name"), position(' ' IN trim(b."name")) + 1, 1))
    ELSE upper(substr(trim(b."name"), 1, 2)) END,
  (SELECT COALESCE(MAX("position"), -1) FROM "CatalogBrand") + ROW_NUMBER() OVER (ORDER BY b."name", b."id")
FROM "Brand" b
WHERE b."id" IN (SELECT iv."vehicleBrandId" FROM "ItemVehicle" iv WHERE iv."firstYear" IS NOT NULL AND iv."vehicleModelId" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "CatalogBrand" c WHERE c."brandId" = b."id");

-- Their catalog models.
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position")
SELECT gen_random_uuid()::text, m."id",
  (SELECT COALESCE(MAX(cm."position"), -1) FROM "CatalogModel" cm JOIN "VehicleModel" vm ON vm."id" = cm."vehicleModelId" WHERE vm."brandId" = m."brandId")
    + ROW_NUMBER() OVER (PARTITION BY m."brandId" ORDER BY m."name", m."id")
FROM "VehicleModel" m
WHERE m."id" IN (SELECT iv."vehicleModelId" FROM "ItemVehicle" iv WHERE iv."firstYear" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "CatalogModel" c WHERE c."vehicleModelId" = m."id");

-- Their generations, named by their years ("1985–1990", "2019–" while still made).
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear")
SELECT gen_random_uuid()::text, g."modelId",
  (SELECT COALESCE(MAX(cg."position"), -1) FROM "CatalogGeneration" cg WHERE cg."modelId" = g."modelId")
    + ROW_NUMBER() OVER (PARTITION BY g."modelId" ORDER BY g."firstYear", g."lastYear"),
  CAST(g."firstYear" AS TEXT) || '–' || COALESCE(CAST(g."lastYear" AS TEXT), ''), g."firstYear", g."lastYear"
FROM (
  SELECT DISTINCT cm."id" AS "modelId", iv."firstYear", iv."lastYear"
  FROM "ItemVehicle" iv JOIN "CatalogModel" cm ON cm."vehicleModelId" = iv."vehicleModelId"
  WHERE iv."firstYear" IS NOT NULL
) g
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogGeneration" cg WHERE cg."modelId" = g."modelId" AND cg."firstYear" = g."firstYear" AND cg."lastYear" IS NOT DISTINCT FROM g."lastYear"
);

-- Each vehicle with a generation, linked to it (the first of the model's generations with those years).
UPDATE "ItemVehicle" iv SET "generationId" = (
  SELECT cg."id" FROM "CatalogGeneration" cg JOIN "CatalogModel" cm ON cm."id" = cg."modelId"
  WHERE cm."vehicleModelId" = iv."vehicleModelId" AND cg."firstYear" = iv."firstYear" AND cg."lastYear" IS NOT DISTINCT FROM iv."lastYear"
  ORDER BY cg."position", cg."id" LIMIT 1
)
WHERE iv."firstYear" IS NOT NULL AND iv."vehicleModelId" IS NOT NULL;

-- Their versions, one of each name ignoring case.
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name")
SELECT gen_random_uuid()::text, v."generationId",
  (SELECT COALESCE(MAX(c."position"), -1) FROM "CatalogVersion" c WHERE c."generationId" = v."generationId")
    + ROW_NUMBER() OVER (PARTITION BY v."generationId" ORDER BY v."name"),
  v."name"
FROM (
  SELECT iv."generationId", MIN(iv."version") AS "name"
  FROM "ItemVehicle" iv WHERE iv."generationId" IS NOT NULL AND iv."version" IS NOT NULL
  GROUP BY iv."generationId", lower(iv."version")
) v
WHERE NOT EXISTS (SELECT 1 FROM "CatalogVersion" c WHERE c."generationId" = v."generationId" AND lower(c."name") = lower(v."name"));

-- Each vehicle with a generation and a version, linked to the version.
UPDATE "ItemVehicle" iv SET "versionId" = (
  SELECT c."id" FROM "CatalogVersion" c WHERE c."generationId" = iv."generationId" AND lower(c."name") = lower(iv."version")
  ORDER BY c."position", c."id" LIMIT 1
)
WHERE iv."generationId" IS NOT NULL AND iv."version" IS NOT NULL;

-- A version saved without a generation, linked to the one version of that name the model has, and to its generation.
UPDATE "ItemVehicle" iv SET "versionId" = (
  SELECT c."id" FROM "CatalogVersion" c JOIN "CatalogGeneration" cg ON cg."id" = c."generationId" JOIN "CatalogModel" cm ON cm."id" = cg."modelId"
  WHERE cm."vehicleModelId" = iv."vehicleModelId" AND lower(c."name") = lower(iv."version")
)
WHERE iv."generationId" IS NULL AND iv."version" IS NOT NULL AND iv."vehicleModelId" IS NOT NULL
  AND (
    SELECT COUNT(*) FROM "CatalogVersion" c JOIN "CatalogGeneration" cg ON cg."id" = c."generationId" JOIN "CatalogModel" cm ON cm."id" = cg."modelId"
    WHERE cm."vehicleModelId" = iv."vehicleModelId" AND lower(c."name") = lower(iv."version")
  ) = 1;
UPDATE "ItemVehicle" iv SET "generationId" = (SELECT c."generationId" FROM "CatalogVersion" c WHERE c."id" = iv."versionId")
WHERE iv."generationId" IS NULL AND iv."versionId" IS NOT NULL;

-- A version still unlinked goes to its item's short description, after what it says, so nothing is lost.
UPDATE "Item" i SET "description" = CASE WHEN COALESCE(i."description", '') = '' THEN v."versions" ELSE i."description" || ' · ' || v."versions" END
FROM (
  SELECT iv."itemId", string_agg(iv."version", ' · ' ORDER BY iv."position") AS "versions"
  FROM "ItemVehicle" iv WHERE iv."version" IS NOT NULL AND iv."versionId" IS NULL
  GROUP BY iv."itemId"
) v
WHERE v."itemId" = i."id";

-- The years and the version now come from the catalog.
ALTER TABLE "ItemVehicle" DROP COLUMN "firstYear", DROP COLUMN "lastYear", DROP COLUMN "version";

-- CreateIndex
CREATE INDEX "ItemVehicle_generationId_idx" ON "ItemVehicle"("generationId");

-- CreateIndex
CREATE INDEX "ItemVehicle_versionId_idx" ON "ItemVehicle"("versionId");

-- AddForeignKey
ALTER TABLE "ItemVehicle" ADD CONSTRAINT "ItemVehicle_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "CatalogGeneration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVehicle" ADD CONSTRAINT "ItemVehicle_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CatalogVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
