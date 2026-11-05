-- The devices users log in from (Device): each one's public key, the name the approver gave it and its dates, pending
-- until the server's computer authorizes it. Every session now belongs to a device, so the sessions from before, which
-- have none, end here: everyone logs in once more, and a device other than the server's computer waits to be
-- authorized.

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'AUTHORIZED');

-- EndSessions
DELETE FROM "Session";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_publicKey_key" ON "Device"("userId", "publicKey");

-- CreateIndex
CREATE INDEX "Session_deviceId_idx" ON "Session"("deviceId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
