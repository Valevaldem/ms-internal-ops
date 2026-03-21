-- AlterTable
ALTER TABLE "models" ADD COLUMN "piece_type_id" TEXT;

-- Map existing models' piece_type string to the proper piece_type_id
UPDATE "models"
SET "piece_type_id" = "piece_types"."piece_type_id"
FROM "piece_types"
WHERE "models"."piece_type" = "piece_types"."piece_type_name";

-- For any models that had a pieceType string that didn't match an existing PieceType,
-- assign them to 'Other' or the first available piece type, to satisfy NOT NULL constraints.
UPDATE "models"
SET "piece_type_id" = (SELECT "piece_type_id" FROM "piece_types" WHERE "piece_type_name" = 'Other' LIMIT 1)
WHERE "piece_type_id" IS NULL;

-- If 'Other' didn't exist, just fallback to the first one available
UPDATE "models"
SET "piece_type_id" = (SELECT "piece_type_id" FROM "piece_types" LIMIT 1)
WHERE "piece_type_id" IS NULL;

-- If piece_type_id is STILL null (e.g. no piece types exist), we can't make it NOT NULL safely,
-- but in production we know piece types exist.
-- Now drop the old column
ALTER TABLE "models" DROP COLUMN "piece_type";

-- Alter the column to NOT NULL
ALTER TABLE "models" ALTER COLUMN "piece_type_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_piece_type_id_fkey" FOREIGN KEY ("piece_type_id") REFERENCES "piece_types"("piece_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "models_model_name_piece_type_id_key" ON "models"("model_name", "piece_type_id");
