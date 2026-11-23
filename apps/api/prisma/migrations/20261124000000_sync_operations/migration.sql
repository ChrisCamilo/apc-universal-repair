-- The operations a phone sent to POST /sync/operations that were applied, each kept by its device and the id the phone
-- gave it, with its answer, so the same operation sent again answers what it answered and changes nothing.
-- CreateTable
CREATE TABLE "SyncOperation" (
    "deviceId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("deviceId","id")
);

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
