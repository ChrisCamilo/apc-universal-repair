-- A catalog version's years become periods: each has a first year ("year", as before) and a last year, the same for a
-- single year, so the engines of a version made for years are typed once. Every year saved becomes a period of that
-- year alone, so nothing is lost.
--
-- SQLite can't add a column NOT NULL without a default, so CatalogYear is made again. The migration runs in a
-- transaction, where PRAGMA foreign_keys=OFF has no effect, so dropping CatalogYear while CatalogEngine points at it
-- would delete every engine. Instead the old table is renamed first (CatalogEngine follows the new name), CatalogEngine
-- is made again pointing at the new CatalogYear, and the old table goes once nothing points at it.

-- RedefineTables
ALTER TABLE "CatalogYear" RENAME TO "old_CatalogYear";
CREATE TABLE "CatalogYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "lastYear" INTEGER NOT NULL,
    CONSTRAINT "CatalogYear_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CatalogVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "CatalogYear" ("id", "versionId", "position", "year", "lastYear") SELECT "id", "versionId", "position", "year", "year" FROM "old_CatalogYear";
CREATE TABLE "new_CatalogEngine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "displacementDl" INTEGER NOT NULL,
    "cylinders" INTEGER NOT NULL,
    "drive" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "CatalogEngine_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "CatalogYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CatalogEngine" ("id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary") SELECT "id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary" FROM "CatalogEngine";
DROP TABLE "CatalogEngine";
ALTER TABLE "new_CatalogEngine" RENAME TO "CatalogEngine";
DROP TABLE "old_CatalogYear";
CREATE INDEX "CatalogEngine_yearId_idx" ON "CatalogEngine"("yearId");
CREATE INDEX "CatalogYear_versionId_idx" ON "CatalogYear"("versionId");
