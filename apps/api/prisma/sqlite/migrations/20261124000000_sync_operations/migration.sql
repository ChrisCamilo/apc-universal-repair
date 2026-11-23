-- The operations a phone sent to POST /sync/operations that were applied, each kept by its device and the id the phone
-- gave it, with its answer, so the same operation sent again answers what it answered and changes nothing.
-- CreateTable
CREATE TABLE "SyncOperation" (
    "deviceId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("deviceId", "id"),
    CONSTRAINT "SyncOperation_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
