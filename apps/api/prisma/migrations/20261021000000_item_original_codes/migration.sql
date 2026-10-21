-- The vehicle maker's original codes of each item; the items there are start with none.

-- CreateTable
CREATE TABLE "ItemOriginalCode" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,

    CONSTRAINT "ItemOriginalCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemOriginalCode_code_key" ON "ItemOriginalCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOriginalCode_codeKey_key" ON "ItemOriginalCode"("codeKey");

-- CreateIndex
CREATE INDEX "ItemOriginalCode_itemId_idx" ON "ItemOriginalCode"("itemId");

-- AddForeignKey
ALTER TABLE "ItemOriginalCode" ADD CONSTRAINT "ItemOriginalCode_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
