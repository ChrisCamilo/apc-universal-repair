-- A catalog version's years become periods: each has a first year ("year", as before) and a last year, the same for a
-- single year, so the engines of a version made for years are typed once. Every year saved becomes a period of that
-- year alone, so nothing is lost.

-- AlterTable
ALTER TABLE "CatalogYear" ADD COLUMN "lastYear" INTEGER;
UPDATE "CatalogYear" SET "lastYear" = "year";
ALTER TABLE "CatalogYear" ALTER COLUMN "lastYear" SET NOT NULL;
