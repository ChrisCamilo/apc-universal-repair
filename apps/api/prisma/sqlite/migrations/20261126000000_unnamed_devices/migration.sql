-- A device authorized without a typed name was saved as "Dispositivo <code>", in Portuguese, the code being its six
-- letters and digits of base32. The API now keeps that name empty, and each app writes "Dispositivo <code>" or
-- "Device <code>" in its language, so the names written that way go back to empty; a name the approver typed stays.
UPDATE "Device" SET "name" = '' WHERE "name" GLOB 'Dispositivo [A-Z2-7][A-Z2-7][A-Z2-7][A-Z2-7][A-Z2-7][A-Z2-7]';
