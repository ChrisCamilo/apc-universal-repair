-- An item may say what its part is made of and carry a short description; items from before have neither.

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "material" TEXT;
ALTER TABLE "Item" ADD COLUMN "description" TEXT;
