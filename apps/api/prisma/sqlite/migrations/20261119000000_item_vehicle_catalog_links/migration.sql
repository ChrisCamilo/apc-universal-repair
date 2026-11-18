-- An item's vehicle points at the catalog's generation and version instead of keeping years and a version of its own,
-- so the catalog and the stock hold one and the same: a generation's years or a version's name changed in the Catalog
-- show on every item, and one an item uses can't be deleted. The vehicles saved before are linked here:
-- 1. the catalog brands, models, generations (named by their years) and versions the saved vehicles name and the
--    Catalog doesn't have are added to it, at the end of their siblings;
-- 2. each vehicle with a generation is linked to it, and to its version, matched ignoring case;
-- 3. a version saved without a generation is linked to the one version of that name the model has in the Catalog;
-- 4. a version still unlinked goes to its item's short description, so nothing is lost.
-- A version now always belongs to a generation. Ids are UUIDs v4 made from random bytes. ItemVehicle is made again at
-- the end, with its links to the catalog; no table points at it, so dropping it deletes nothing else.

-- AlterTable
ALTER TABLE "ItemVehicle" ADD COLUMN "generationId" TEXT;
ALTER TABLE "ItemVehicle" ADD COLUMN "versionId" TEXT;

-- The catalog brands of the vehicles with a generation, with their letters (brandMark: the first letters of the first
-- two words, or the first two letters).
INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position")
SELECT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))), b."id",
  CASE WHEN instr(trim(b."name"), ' ') > 0
    THEN upper(substr(trim(b."name"), 1, 1) || substr(trim(b."name"), instr(trim(b."name"), ' ') + 1, 1))
    ELSE upper(substr(trim(b."name"), 1, 2)) END,
  (SELECT COALESCE(MAX("position"), -1) FROM "CatalogBrand") + ROW_NUMBER() OVER (ORDER BY b."name", b."id")
FROM "Brand" b
WHERE b."id" IN (SELECT iv."vehicleBrandId" FROM "ItemVehicle" iv WHERE iv."firstYear" IS NOT NULL AND iv."vehicleModelId" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "CatalogBrand" c WHERE c."brandId" = b."id");

-- Their catalog models.
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position")
SELECT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))), m."id",
  (SELECT COALESCE(MAX(cm."position"), -1) FROM "CatalogModel" cm JOIN "VehicleModel" vm ON vm."id" = cm."vehicleModelId" WHERE vm."brandId" = m."brandId")
    + ROW_NUMBER() OVER (PARTITION BY m."brandId" ORDER BY m."name", m."id")
FROM "VehicleModel" m
WHERE m."id" IN (SELECT iv."vehicleModelId" FROM "ItemVehicle" iv WHERE iv."firstYear" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "CatalogModel" c WHERE c."vehicleModelId" = m."id");

-- Their generations, named by their years ("1985–1990", "2019–" while still made).
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear")
SELECT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))), g."modelId",
  (SELECT COALESCE(MAX(cg."position"), -1) FROM "CatalogGeneration" cg WHERE cg."modelId" = g."modelId")
    + ROW_NUMBER() OVER (PARTITION BY g."modelId" ORDER BY g."firstYear", g."lastYear"),
  CAST(g."firstYear" AS TEXT) || '–' || COALESCE(CAST(g."lastYear" AS TEXT), ''), g."firstYear", g."lastYear"
FROM (
  SELECT DISTINCT cm."id" AS "modelId", iv."firstYear", iv."lastYear"
  FROM "ItemVehicle" iv JOIN "CatalogModel" cm ON cm."vehicleModelId" = iv."vehicleModelId"
  WHERE iv."firstYear" IS NOT NULL
) g
WHERE NOT EXISTS (
  SELECT 1 FROM "CatalogGeneration" cg WHERE cg."modelId" = g."modelId" AND cg."firstYear" = g."firstYear" AND cg."lastYear" IS g."lastYear"
);

-- Each vehicle with a generation, linked to it (the first of the model's generations with those years).
UPDATE "ItemVehicle" SET "generationId" = (
  SELECT cg."id" FROM "CatalogGeneration" cg JOIN "CatalogModel" cm ON cm."id" = cg."modelId"
  WHERE cm."vehicleModelId" = "ItemVehicle"."vehicleModelId" AND cg."firstYear" = "ItemVehicle"."firstYear" AND cg."lastYear" IS "ItemVehicle"."lastYear"
  ORDER BY cg."position", cg."id" LIMIT 1
)
WHERE "firstYear" IS NOT NULL AND "vehicleModelId" IS NOT NULL;

-- Their versions, one of each name ignoring case.
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name")
SELECT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))), v."generationId",
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
UPDATE "ItemVehicle" SET "versionId" = (
  SELECT c."id" FROM "CatalogVersion" c WHERE c."generationId" = "ItemVehicle"."generationId" AND lower(c."name") = lower("ItemVehicle"."version")
  ORDER BY c."position", c."id" LIMIT 1
)
WHERE "generationId" IS NOT NULL AND "version" IS NOT NULL;

-- A version saved without a generation, linked to the one version of that name the model has, and to its generation.
UPDATE "ItemVehicle" SET "versionId" = (
  SELECT c."id" FROM "CatalogVersion" c JOIN "CatalogGeneration" cg ON cg."id" = c."generationId" JOIN "CatalogModel" cm ON cm."id" = cg."modelId"
  WHERE cm."vehicleModelId" = "ItemVehicle"."vehicleModelId" AND lower(c."name") = lower("ItemVehicle"."version")
)
WHERE "generationId" IS NULL AND "version" IS NOT NULL AND "vehicleModelId" IS NOT NULL
  AND (
    SELECT COUNT(*) FROM "CatalogVersion" c JOIN "CatalogGeneration" cg ON cg."id" = c."generationId" JOIN "CatalogModel" cm ON cm."id" = cg."modelId"
    WHERE cm."vehicleModelId" = "ItemVehicle"."vehicleModelId" AND lower(c."name") = lower("ItemVehicle"."version")
  ) = 1;
UPDATE "ItemVehicle" SET "generationId" = (SELECT c."generationId" FROM "CatalogVersion" c WHERE c."id" = "ItemVehicle"."versionId")
WHERE "generationId" IS NULL AND "versionId" IS NOT NULL;

-- A version still unlinked goes to its item's short description, after what it says, so nothing is lost.
UPDATE "Item" SET "description" = CASE WHEN COALESCE("Item"."description", '') = '' THEN v."versions" ELSE "Item"."description" || ' · ' || v."versions" END
FROM (
  SELECT o."itemId", group_concat(o."version", ' · ') AS "versions"
  FROM (SELECT iv."itemId", iv."version" FROM "ItemVehicle" iv WHERE iv."version" IS NOT NULL AND iv."versionId" IS NULL ORDER BY iv."itemId", iv."position") o
  GROUP BY o."itemId"
) v
WHERE v."itemId" = "Item"."id";

-- RedefineTables: the years and the version now come from the catalog.
CREATE TABLE "new_ItemVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "vehicleBrandId" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    "generationId" TEXT,
    "versionId" TEXT,
    CONSTRAINT "ItemVehicle_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemVehicle_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemVehicle_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemVehicle_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "CatalogGeneration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemVehicle_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CatalogVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ItemVehicle" ("id", "itemId", "position", "vehicleBrandId", "vehicleModelId", "generationId", "versionId")
SELECT "id", "itemId", "position", "vehicleBrandId", "vehicleModelId", "generationId", "versionId" FROM "ItemVehicle";
DROP TABLE "ItemVehicle";
ALTER TABLE "new_ItemVehicle" RENAME TO "ItemVehicle";
CREATE INDEX "ItemVehicle_itemId_idx" ON "ItemVehicle"("itemId");
CREATE INDEX "ItemVehicle_vehicleBrandId_idx" ON "ItemVehicle"("vehicleBrandId");
CREATE INDEX "ItemVehicle_vehicleModelId_idx" ON "ItemVehicle"("vehicleModelId");
CREATE INDEX "ItemVehicle_generationId_idx" ON "ItemVehicle"("generationId");
CREATE INDEX "ItemVehicle_versionId_idx" ON "ItemVehicle"("versionId");
