-- CreateEnum
CREATE TYPE "EngineDrive" AS ENUM ('FRONT', 'REAR', 'ALL');

-- CreateTable
CREATE TABLE "CatalogBrand" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "mark" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CatalogBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogEngine" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "displacementDl" INTEGER NOT NULL,
    "cylinders" INTEGER NOT NULL,
    "drive" "EngineDrive" NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "CatalogEngine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogGeneration" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "firstYear" INTEGER NOT NULL,
    "lastYear" INTEGER,

    CONSTRAINT "CatalogGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogModel" (
    "id" TEXT NOT NULL,
    "vehicleModelId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CatalogModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogVersion" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CatalogVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogYear" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "CatalogYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogBrand_brandId_key" ON "CatalogBrand"("brandId");

-- CreateIndex
CREATE INDEX "CatalogEngine_yearId_idx" ON "CatalogEngine"("yearId");

-- CreateIndex
CREATE INDEX "CatalogGeneration_modelId_idx" ON "CatalogGeneration"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogModel_vehicleModelId_key" ON "CatalogModel"("vehicleModelId");

-- CreateIndex
CREATE INDEX "CatalogVersion_generationId_idx" ON "CatalogVersion"("generationId");

-- CreateIndex
CREATE INDEX "CatalogYear_versionId_idx" ON "CatalogYear"("versionId");

-- AddForeignKey
ALTER TABLE "CatalogBrand" ADD CONSTRAINT "CatalogBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogEngine" ADD CONSTRAINT "CatalogEngine_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "CatalogYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogGeneration" ADD CONSTRAINT "CatalogGeneration_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "CatalogModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogModel" ADD CONSTRAINT "CatalogModel_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogVersion" ADD CONSTRAINT "CatalogVersion_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "CatalogGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogYear" ADD CONSTRAINT "CatalogYear_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CatalogVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The catalog a new database starts with, the same as TEST_CATALOG_DATA in @apc/domain/test-catalog, ids included:
-- each brand and model is added to the lists unless the lists hold its name already, and is then made a catalog
-- brand or model, with its generations, versions, years and engines.

-- Chevrolet
INSERT INTO "Brand" ("id", "name", "nameKey") SELECT 'ca7a1000-0000-4000-8000-000000000001', 'Chevrolet', 'chevrolet' WHERE NOT EXISTS (SELECT 1 FROM "Brand" WHERE "nameKey" = 'chevrolet');
INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position") VALUES ('ca7a1000-0000-4000-a000-000000000001', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet'), 'CH', 0);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000001', 'Chevette', 'chevette', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') AND "nameKey" = 'chevette');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000003', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') AND "nameKey" = 'chevette'), 0);
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear") VALUES ('ca7a1000-0000-4000-8000-000000000002', 'ca7a1000-0000-4000-8000-000000000003', 0, 'Segunda geração', 1983, 1993);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000002', 'Opala', 'opala', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') AND "nameKey" = 'opala');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000014', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') AND "nameKey" = 'opala'), 1);
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear") VALUES ('ca7a1000-0000-4000-8000-000000000004', 'ca7a1000-0000-4000-8000-000000000014', 0, 'Primeira geração', 1968, 1974);
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear") VALUES ('ca7a1000-0000-4000-8000-000000000005', 'ca7a1000-0000-4000-8000-000000000014', 1, 'Segunda geração', 1975, 1979);
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear") VALUES ('ca7a1000-0000-4000-8000-000000000006', 'ca7a1000-0000-4000-8000-000000000014', 2, 'Terceira geração', 1980, 1992);
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name") VALUES ('ca7a1000-0000-4000-8000-000000000007', 'ca7a1000-0000-4000-8000-000000000006', 0, 'Comodoro');
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name") VALUES ('ca7a1000-0000-4000-8000-000000000008', 'ca7a1000-0000-4000-8000-000000000006', 1, 'Diplomata');
INSERT INTO "CatalogYear" ("id", "versionId", "position", "year") VALUES ('ca7a1000-0000-4000-8000-000000000009', 'ca7a1000-0000-4000-8000-000000000008', 0, 1985);
INSERT INTO "CatalogYear" ("id", "versionId", "position", "year") VALUES ('ca7a1000-0000-4000-8000-000000000010', 'ca7a1000-0000-4000-8000-000000000008', 1, 1986);
INSERT INTO "CatalogEngine" ("id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary") VALUES ('ca7a1000-0000-4000-8000-000000000011', 'ca7a1000-0000-4000-8000-000000000010', 0, 25, 4, 'REAR', 'Opção de entrada do Diplomata, o quatro-cilindros 2.5 usa bloco de ferro fundido e comando no bloco, priorizando torque em baixa sobre giro alto. Pesa menos sobre o eixo dianteiro e deixa a direção mais leve.');
INSERT INTO "CatalogEngine" ("id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary") VALUES ('ca7a1000-0000-4000-8000-000000000012', 'ca7a1000-0000-4000-8000-000000000010', 1, 41, 6, 'REAR', 'O seis-cilindros em linha de 4,1 L é a configuração mais lembrada do Opala e ajudou o Diplomata a virar sinônimo de conforto nos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e suave.');
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name") VALUES ('ca7a1000-0000-4000-8000-000000000013', 'ca7a1000-0000-4000-8000-000000000006', 2, 'SS');
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000003', 'Monza', 'monza', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') AND "nameKey" = 'monza');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000015', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'chevrolet') AND "nameKey" = 'monza'), 2);

-- Volkswagen
INSERT INTO "Brand" ("id", "name", "nameKey") SELECT 'ca7a1000-0000-4000-8000-000000000016', 'Volkswagen', 'volkswagen' WHERE NOT EXISTS (SELECT 1 FROM "Brand" WHERE "nameKey" = 'volkswagen');
INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position") VALUES ('ca7a1000-0000-4000-a000-000000000002', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen'), 'VW', 1);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000004', 'Fusca', 'fusca', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') AND "nameKey" = 'fusca');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000017', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') AND "nameKey" = 'fusca'), 0);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000005', 'Gol', 'gol', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') AND "nameKey" = 'gol');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000022', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') AND "nameKey" = 'gol'), 1);
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear") VALUES ('ca7a1000-0000-4000-8000-000000000018', 'ca7a1000-0000-4000-8000-000000000022', 0, 'Primeira geração', 1980, 1994);
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name") VALUES ('ca7a1000-0000-4000-8000-000000000019', 'ca7a1000-0000-4000-8000-000000000018', 0, 'GTS');
INSERT INTO "CatalogYear" ("id", "versionId", "position", "year") VALUES ('ca7a1000-0000-4000-8000-000000000020', 'ca7a1000-0000-4000-8000-000000000019', 0, 1989);
INSERT INTO "CatalogEngine" ("id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary") VALUES ('ca7a1000-0000-4000-8000-000000000021', 'ca7a1000-0000-4000-8000-000000000020', 0, 18, 4, 'FRONT', 'Versão esportiva do primeiro Gol, com o motor AP 1.8 a álcool ou gasolina, câmbio de cinco marchas e acerto de suspensão mais firme que o das versões de entrada.');
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000006', 'Santana', 'santana', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') AND "nameKey" = 'santana');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000023', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'volkswagen') AND "nameKey" = 'santana'), 2);

-- Fiat
INSERT INTO "Brand" ("id", "name", "nameKey") SELECT 'ca7a1000-0000-4000-8000-000000000024', 'Fiat', 'fiat' WHERE NOT EXISTS (SELECT 1 FROM "Brand" WHERE "nameKey" = 'fiat');
INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position") VALUES ('ca7a1000-0000-4000-a000-000000000003', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat'), 'FI', 2);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000007', '147', '147', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') AND "nameKey" = '147');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000025', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') AND "nameKey" = '147'), 0);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000008', 'Uno', 'uno', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') AND "nameKey" = 'uno');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000030', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') AND "nameKey" = 'uno'), 1);
INSERT INTO "CatalogGeneration" ("id", "modelId", "position", "name", "firstYear", "lastYear") VALUES ('ca7a1000-0000-4000-8000-000000000026', 'ca7a1000-0000-4000-8000-000000000030', 0, 'Primeira geração', 1984, 2013);
INSERT INTO "CatalogVersion" ("id", "generationId", "position", "name") VALUES ('ca7a1000-0000-4000-8000-000000000027', 'ca7a1000-0000-4000-8000-000000000026', 0, 'Mille');
INSERT INTO "CatalogYear" ("id", "versionId", "position", "year") VALUES ('ca7a1000-0000-4000-8000-000000000028', 'ca7a1000-0000-4000-8000-000000000027', 0, 1991);
INSERT INTO "CatalogEngine" ("id", "yearId", "position", "displacementDl", "cylinders", "drive", "summary") VALUES ('ca7a1000-0000-4000-8000-000000000029', 'ca7a1000-0000-4000-8000-000000000028', 0, 10, 4, 'FRONT', 'O Uno de mil cilindradas que abriu a era dos carros populares no Brasil: motor pequeno e econômico, manutenção simples e peças fáceis de achar.');
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000009', 'Tempra', 'tempra', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') AND "nameKey" = 'tempra');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000031', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'fiat') AND "nameKey" = 'tempra'), 2);

-- Ford
INSERT INTO "Brand" ("id", "name", "nameKey") SELECT 'ca7a1000-0000-4000-8000-000000000032', 'Ford', 'ford' WHERE NOT EXISTS (SELECT 1 FROM "Brand" WHERE "nameKey" = 'ford');
INSERT INTO "CatalogBrand" ("id", "brandId", "mark", "position") VALUES ('ca7a1000-0000-4000-a000-000000000004', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford'), 'FO', 3);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000010', 'Corcel', 'corcel', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') AND "nameKey" = 'corcel');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000033', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') AND "nameKey" = 'corcel'), 0);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000011', 'Del Rey', 'del rey', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') AND "nameKey" = 'del rey');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000034', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') AND "nameKey" = 'del rey'), 1);
INSERT INTO "VehicleModel" ("id", "name", "nameKey", "brandId") SELECT 'ca7a1000-0000-4000-9000-000000000012', 'Escort', 'escort', (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') WHERE NOT EXISTS (SELECT 1 FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') AND "nameKey" = 'escort');
INSERT INTO "CatalogModel" ("id", "vehicleModelId", "position") VALUES ('ca7a1000-0000-4000-8000-000000000035', (SELECT "id" FROM "VehicleModel" WHERE "brandId" = (SELECT "id" FROM "Brand" WHERE "nameKey" = 'ford') AND "nameKey" = 'escort'), 2);
