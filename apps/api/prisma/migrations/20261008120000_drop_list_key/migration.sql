-- Drops the name-key helper that 20261008000000_item_lists creates in pg_temp, which lives as long as the database
-- session. On an empty database, `prisma migrate deploy` applies every migration in one session, so the next migration
-- couldn't create it again and the database stopped half migrated. Databases migrated one step at a time never kept it,
-- so this changes nothing for them, wherever it lands in their history. The migrations already applied stay as they
-- are, so their checksums still match.
DROP FUNCTION IF EXISTS pg_temp.list_key(TEXT);
