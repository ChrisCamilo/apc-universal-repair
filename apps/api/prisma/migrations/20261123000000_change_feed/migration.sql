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

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PartBrand" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VehicleModel" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogBrand" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogModel" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogGeneration" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogVersion" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogYear" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CatalogEngine" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ItemBrand" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ItemPhoto" ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL,
    "databaseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "prunedVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncTombstone" (
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncTombstone_pkey" PRIMARY KEY ("version")
);

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
INSERT INTO "SyncState" ("id", "databaseId") VALUES (1, gen_random_uuid()::text);

-- The next version, from the state's row, which stays locked until the transaction ends.
CREATE FUNCTION sync_next_version() RETURNS INTEGER LANGUAGE sql AS $$
  UPDATE "SyncState" SET "version" = "version" + 1 WHERE "id" = 1 RETURNING "version";
$$;

-- Gives an inserted or updated row the next version.
CREATE FUNCTION sync_stamp() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."syncVersion" := sync_next_version();
  RETURN NEW;
END;
$$;

-- Keeps a tombstone of a deleted row, with the kind the trigger names, when in UTC as Prisma keeps dates.
CREATE FUNCTION sync_tombstone() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "SyncTombstone" ("version", "kind", "rowId", "deletedAt")
  VALUES (sync_next_version(), TG_ARGV[0], OLD."id", now() AT TIME ZONE 'UTC');
  RETURN OLD;
END;
$$;

-- Gives the item of a changed vehicle or original code the next version, and the one it left, if it moved.
CREATE FUNCTION sync_touch_item() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN
    UPDATE "Item" SET "syncVersion" = sync_next_version() WHERE "id" = NEW."itemId";
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD."itemId" <> NEW."itemId") THEN
    UPDATE "Item" SET "syncVersion" = sync_next_version() WHERE "id" = OLD."itemId";
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER "Category_sync_insert" BEFORE INSERT ON "Category" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "Category_sync_update" BEFORE UPDATE ON "Category" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "Category_sync_delete" AFTER DELETE ON "Category" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('category');

CREATE TRIGGER "PartBrand_sync_insert" BEFORE INSERT ON "PartBrand" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "PartBrand_sync_update" BEFORE UPDATE ON "PartBrand" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "PartBrand_sync_delete" AFTER DELETE ON "PartBrand" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('partBrand');

CREATE TRIGGER "Brand_sync_insert" BEFORE INSERT ON "Brand" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "Brand_sync_update" BEFORE UPDATE ON "Brand" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "Brand_sync_delete" AFTER DELETE ON "Brand" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('vehicleBrand');

CREATE TRIGGER "VehicleModel_sync_insert" BEFORE INSERT ON "VehicleModel" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "VehicleModel_sync_update" BEFORE UPDATE ON "VehicleModel" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "VehicleModel_sync_delete" AFTER DELETE ON "VehicleModel" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('vehicleModel');

CREATE TRIGGER "CatalogBrand_sync_insert" BEFORE INSERT ON "CatalogBrand" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogBrand_sync_update" BEFORE UPDATE ON "CatalogBrand" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogBrand_sync_delete" AFTER DELETE ON "CatalogBrand" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('catalogBrand');

CREATE TRIGGER "CatalogModel_sync_insert" BEFORE INSERT ON "CatalogModel" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogModel_sync_update" BEFORE UPDATE ON "CatalogModel" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogModel_sync_delete" AFTER DELETE ON "CatalogModel" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('catalogModel');

CREATE TRIGGER "CatalogGeneration_sync_insert" BEFORE INSERT ON "CatalogGeneration" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogGeneration_sync_update" BEFORE UPDATE ON "CatalogGeneration" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogGeneration_sync_delete" AFTER DELETE ON "CatalogGeneration" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('catalogGeneration');

CREATE TRIGGER "CatalogVersion_sync_insert" BEFORE INSERT ON "CatalogVersion" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogVersion_sync_update" BEFORE UPDATE ON "CatalogVersion" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogVersion_sync_delete" AFTER DELETE ON "CatalogVersion" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('catalogVersion');

CREATE TRIGGER "CatalogYear_sync_insert" BEFORE INSERT ON "CatalogYear" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogYear_sync_update" BEFORE UPDATE ON "CatalogYear" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogYear_sync_delete" AFTER DELETE ON "CatalogYear" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('catalogYear');

CREATE TRIGGER "CatalogEngine_sync_insert" BEFORE INSERT ON "CatalogEngine" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogEngine_sync_update" BEFORE UPDATE ON "CatalogEngine" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "CatalogEngine_sync_delete" AFTER DELETE ON "CatalogEngine" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('catalogEngine');

CREATE TRIGGER "Item_sync_insert" BEFORE INSERT ON "Item" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "Item_sync_update" BEFORE UPDATE ON "Item" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "Item_sync_delete" AFTER DELETE ON "Item" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('item');

CREATE TRIGGER "ItemBrand_sync_insert" BEFORE INSERT ON "ItemBrand" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "ItemBrand_sync_update" BEFORE UPDATE ON "ItemBrand" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "ItemBrand_sync_delete" AFTER DELETE ON "ItemBrand" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('itemBrand');

CREATE TRIGGER "ItemPhoto_sync_insert" BEFORE INSERT ON "ItemPhoto" FOR EACH ROW EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "ItemPhoto_sync_update" BEFORE UPDATE ON "ItemPhoto" FOR EACH ROW WHEN (OLD."syncVersion" = NEW."syncVersion") EXECUTE FUNCTION sync_stamp();
CREATE TRIGGER "ItemPhoto_sync_delete" AFTER DELETE ON "ItemPhoto" FOR EACH ROW EXECUTE FUNCTION sync_tombstone('itemPhoto');

CREATE TRIGGER "ItemVehicle_sync_item" AFTER INSERT OR UPDATE OR DELETE ON "ItemVehicle" FOR EACH ROW EXECUTE FUNCTION sync_touch_item();

CREATE TRIGGER "ItemOriginalCode_sync_item" AFTER INSERT OR UPDATE OR DELETE ON "ItemOriginalCode" FOR EACH ROW EXECUTE FUNCTION sync_touch_item();

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
