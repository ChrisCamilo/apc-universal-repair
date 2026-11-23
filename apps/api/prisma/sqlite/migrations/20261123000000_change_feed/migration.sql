-- The change feed (GET /sync/changes): every row of the inventory, its lists and the catalog gets a syncVersion that
-- grows with each change, and each deletion leaves a tombstone, so a phone's copy can ask what changed after the last
-- version it saw. The versions come from SyncState's one row, given by triggers on each table, so every write reaches
-- the feed, whatever makes it (a route, a merge, a delete that cascades, a migration): an insert or update takes the
-- next version, a delete keeps a tombstone with it, and a change to an item's vehicles or original codes, which the
-- feed sends inside the item, gives the item the next version. Taking a version updates SyncState's row, which stays
-- locked until the transaction ends, so a transaction never sees a version given after one still uncommitted.
-- A trigger that stamps a row's own syncVersion runs only when the write left it as it was, so stamping doesn't run
-- twice. The rows already saved get their first versions at the end, lists and catalog before the items.
-- A migration that redefines one of these tables must create its triggers again (sync.db-test.ts checks they're there).

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "databaseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "prunedVersion" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SyncTombstone" (
    "version" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "deletedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable: a column added in place, as redefining a table would delete the rows that cascade from it.
ALTER TABLE "Category" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PartBrand" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Brand" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VehicleModel" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogBrand" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogModel" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogGeneration" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogVersion" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogYear" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogEngine" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Item" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ItemBrand" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ItemPhoto" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Category_syncVersion_idx" ON "Category"("syncVersion");

-- CreateIndex
CREATE INDEX "PartBrand_syncVersion_idx" ON "PartBrand"("syncVersion");

-- CreateIndex
CREATE INDEX "Brand_syncVersion_idx" ON "Brand"("syncVersion");

-- CreateIndex
CREATE INDEX "VehicleModel_syncVersion_idx" ON "VehicleModel"("syncVersion");

-- CreateIndex
CREATE INDEX "CatalogBrand_syncVersion_idx" ON "CatalogBrand"("syncVersion");

-- CreateIndex
CREATE INDEX "CatalogModel_syncVersion_idx" ON "CatalogModel"("syncVersion");

-- CreateIndex
CREATE INDEX "CatalogGeneration_syncVersion_idx" ON "CatalogGeneration"("syncVersion");

-- CreateIndex
CREATE INDEX "CatalogVersion_syncVersion_idx" ON "CatalogVersion"("syncVersion");

-- CreateIndex
CREATE INDEX "CatalogYear_syncVersion_idx" ON "CatalogYear"("syncVersion");

-- CreateIndex
CREATE INDEX "CatalogEngine_syncVersion_idx" ON "CatalogEngine"("syncVersion");

-- CreateIndex
CREATE INDEX "Item_syncVersion_idx" ON "Item"("syncVersion");

-- CreateIndex
CREATE INDEX "ItemBrand_syncVersion_idx" ON "ItemBrand"("syncVersion");

-- CreateIndex
CREATE INDEX "ItemPhoto_syncVersion_idx" ON "ItemPhoto"("syncVersion");

-- The feed's state, with this database's id.
INSERT INTO "SyncState" ("id", "databaseId") VALUES (1, lower(hex(randomblob(16))));

-- Each table's triggers: an insert or update takes the next version for the row (SQLite's triggers can't change
-- the row being written, so they update it after), and a delete keeps a tombstone, when in UTC as Prisma writes
-- dates.
CREATE TRIGGER "Category_sync_insert" AFTER INSERT ON "Category" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Category" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "Category_sync_update" AFTER UPDATE ON "Category" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Category" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "Category_sync_delete" AFTER DELETE ON "Category" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'category', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "PartBrand_sync_insert" AFTER INSERT ON "PartBrand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "PartBrand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "PartBrand_sync_update" AFTER UPDATE ON "PartBrand" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "PartBrand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "PartBrand_sync_delete" AFTER DELETE ON "PartBrand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'partBrand', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "Brand_sync_insert" AFTER INSERT ON "Brand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Brand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "Brand_sync_update" AFTER UPDATE ON "Brand" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Brand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "Brand_sync_delete" AFTER DELETE ON "Brand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'vehicleBrand', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "VehicleModel_sync_insert" AFTER INSERT ON "VehicleModel" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "VehicleModel" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "VehicleModel_sync_update" AFTER UPDATE ON "VehicleModel" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "VehicleModel" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "VehicleModel_sync_delete" AFTER DELETE ON "VehicleModel" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'vehicleModel', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "CatalogBrand_sync_insert" AFTER INSERT ON "CatalogBrand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogBrand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogBrand_sync_update" AFTER UPDATE ON "CatalogBrand" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogBrand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogBrand_sync_delete" AFTER DELETE ON "CatalogBrand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'catalogBrand', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "CatalogModel_sync_insert" AFTER INSERT ON "CatalogModel" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogModel" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogModel_sync_update" AFTER UPDATE ON "CatalogModel" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogModel" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogModel_sync_delete" AFTER DELETE ON "CatalogModel" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'catalogModel', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "CatalogGeneration_sync_insert" AFTER INSERT ON "CatalogGeneration" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogGeneration" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogGeneration_sync_update" AFTER UPDATE ON "CatalogGeneration" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogGeneration" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogGeneration_sync_delete" AFTER DELETE ON "CatalogGeneration" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'catalogGeneration', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "CatalogVersion_sync_insert" AFTER INSERT ON "CatalogVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogVersion" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogVersion_sync_update" AFTER UPDATE ON "CatalogVersion" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogVersion" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogVersion_sync_delete" AFTER DELETE ON "CatalogVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'catalogVersion', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "CatalogYear_sync_insert" AFTER INSERT ON "CatalogYear" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogYear" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogYear_sync_update" AFTER UPDATE ON "CatalogYear" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogYear" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogYear_sync_delete" AFTER DELETE ON "CatalogYear" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'catalogYear', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "CatalogEngine_sync_insert" AFTER INSERT ON "CatalogEngine" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogEngine" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogEngine_sync_update" AFTER UPDATE ON "CatalogEngine" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "CatalogEngine" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "CatalogEngine_sync_delete" AFTER DELETE ON "CatalogEngine" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'catalogEngine', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "Item_sync_insert" AFTER INSERT ON "Item" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "Item_sync_update" AFTER UPDATE ON "Item" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "Item_sync_delete" AFTER DELETE ON "Item" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'item', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "ItemBrand_sync_insert" AFTER INSERT ON "ItemBrand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "ItemBrand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "ItemBrand_sync_update" AFTER UPDATE ON "ItemBrand" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "ItemBrand" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "ItemBrand_sync_delete" AFTER DELETE ON "ItemBrand" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'itemBrand', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

CREATE TRIGGER "ItemPhoto_sync_insert" AFTER INSERT ON "ItemPhoto" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "ItemPhoto" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "ItemPhoto_sync_update" AFTER UPDATE ON "ItemPhoto" WHEN NEW."syncVersion" = OLD."syncVersion" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "ItemPhoto" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."id";
END;
CREATE TRIGGER "ItemPhoto_sync_delete" AFTER DELETE ON "ItemPhoto" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES ((SELECT "version" FROM "SyncState" WHERE "id" = 1), 'itemPhoto', OLD."id", strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'));
END;

-- A changed vehicle or original code gives its item the next version, and the one it left, if it moved.
CREATE TRIGGER "ItemVehicle_sync_insert" AFTER INSERT ON "ItemVehicle" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."itemId";
END;
CREATE TRIGGER "ItemVehicle_sync_update" AFTER UPDATE ON "ItemVehicle" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."itemId";
END;
CREATE TRIGGER "ItemVehicle_sync_move" AFTER UPDATE OF "itemId" ON "ItemVehicle" WHEN OLD."itemId" <> NEW."itemId" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = OLD."itemId";
END;
CREATE TRIGGER "ItemVehicle_sync_delete" AFTER DELETE ON "ItemVehicle" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = OLD."itemId";
END;

CREATE TRIGGER "ItemOriginalCode_sync_insert" AFTER INSERT ON "ItemOriginalCode" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."itemId";
END;
CREATE TRIGGER "ItemOriginalCode_sync_update" AFTER UPDATE ON "ItemOriginalCode" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = NEW."itemId";
END;
CREATE TRIGGER "ItemOriginalCode_sync_move" AFTER UPDATE OF "itemId" ON "ItemOriginalCode" WHEN OLD."itemId" <> NEW."itemId" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = OLD."itemId";
END;
CREATE TRIGGER "ItemOriginalCode_sync_delete" AFTER DELETE ON "ItemOriginalCode" BEGIN
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1;
  UPDATE "Item" SET "syncVersion" = (SELECT "version" FROM "SyncState" WHERE "id" = 1) WHERE "id" = OLD."itemId";
END;

-- The rows saved before get their first versions.
UPDATE "Category" SET "syncVersion" = "syncVersion";
UPDATE "PartBrand" SET "syncVersion" = "syncVersion";
UPDATE "Brand" SET "syncVersion" = "syncVersion";
UPDATE "VehicleModel" SET "syncVersion" = "syncVersion";
UPDATE "CatalogBrand" SET "syncVersion" = "syncVersion";
UPDATE "CatalogModel" SET "syncVersion" = "syncVersion";
UPDATE "CatalogGeneration" SET "syncVersion" = "syncVersion";
UPDATE "CatalogVersion" SET "syncVersion" = "syncVersion";
UPDATE "CatalogYear" SET "syncVersion" = "syncVersion";
UPDATE "CatalogEngine" SET "syncVersion" = "syncVersion";
UPDATE "Item" SET "syncVersion" = "syncVersion";
UPDATE "ItemBrand" SET "syncVersion" = "syncVersion";
UPDATE "ItemPhoto" SET "syncVersion" = "syncVersion";
