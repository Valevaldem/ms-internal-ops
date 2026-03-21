-- AlterTable
ALTER TABLE "models" ADD COLUMN "piece_type_id" TEXT;

-- Map existing models' piece_type string to the proper piece_type_id
UPDATE "models"
SET "piece_type_id" = "piece_types"."piece_type_id"
FROM "piece_types"
WHERE "models"."piece_type" = "piece_types"."piece_type_name";

-- Verification Step: Ensure no models failed to map
DO $$
DECLARE
  unmapped_count INT;
BEGIN
  SELECT count(*) INTO unmapped_count FROM "models" WHERE "piece_type_id" IS NULL;

  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: Found % unmapped models. Please fix the legacy piece_type strings in the database manually before running this migration to avoid silent data corruption.', unmapped_count;
  END IF;
END $$;

-- Drop the old column safely
ALTER TABLE "models" DROP COLUMN "piece_type";

-- Alter the column to NOT NULL
ALTER TABLE "models" ALTER COLUMN "piece_type_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_piece_type_id_fkey" FOREIGN KEY ("piece_type_id") REFERENCES "piece_types"("piece_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "models_model_name_piece_type_id_key" ON "models"("model_name", "piece_type_id");
