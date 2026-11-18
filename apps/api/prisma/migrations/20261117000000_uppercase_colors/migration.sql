-- A brand's color is kept in uppercase, so the same color is never saved twice in different cases ("Preto" and
-- "preto" are "PRETO"). The accented letters of Portuguese are raised by hand first, since UPPER leaves them as they
-- are under some collations; "N/A" stays as it is.

-- UpdateData
UPDATE "ItemBrand" SET "color" = UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("color", 'á', 'Á'), 'à', 'À'), 'â', 'Â'), 'ã', 'Ã'), 'é', 'É'), 'ê', 'Ê'), 'í', 'Í'), 'ó', 'Ó'), 'ô', 'Ô'), 'õ', 'Õ'), 'ú', 'Ú'), 'ü', 'Ü'), 'ç', 'Ç'));
