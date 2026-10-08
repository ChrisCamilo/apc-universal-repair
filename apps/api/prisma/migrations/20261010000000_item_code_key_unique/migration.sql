-- A part code is unique as the search compares it: letters and digits only, uppercase (codeKey, as codeKey in
-- @apc/shared/items writes it), so "CB4500" and "CB-4500" can't both be in stock. A database holding two such codes
-- has to rename one before this runs.

-- CreateIndex
CREATE UNIQUE INDEX "Item_codeKey_key" ON "Item"("codeKey");
