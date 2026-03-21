import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("=====================================================");
  console.log(" PRE-MIGRATION AUDIT: Model Piece Type Scoping ");
  console.log("=====================================================\n");

  let models;
  try {
     models = await prisma.$queryRaw<any[]>`SELECT "model_name", "piece_type" FROM "models"`;
  } catch (e) {
     models = await prisma.$queryRaw<any[]>`SELECT "model_name", "piece_type_id" FROM "models"`;
  }

  const pieceTypes = await prisma.$queryRaw<any[]>`SELECT "piece_type_id", "piece_type_name" FROM "piece_types"`;

  const validTypesByName = new Set(pieceTypes.map(pt => pt.piece_type_name));
  const validTypesById = new Set(pieceTypes.map(pt => pt.piece_type_id));

  const totalRows = models.length;
  let successfulMapCount = 0;
  const unmatchedRows: any[] = [];

  const modelUniquenessTracker = new Map<string, number>();
  const duplicateRows: any[] = [];

  for (const model of models) {
    const ptValue = model.piece_type || model.piece_type_id;
    const ptName = model.piece_type ? model.piece_type : pieceTypes.find(pt => pt.piece_type_id === model.piece_type_id)?.piece_type_name;
    const isMappedByName = validTypesByName.has(ptValue);
    const isMappedById = validTypesById.has(ptValue);

    if (isMappedByName || isMappedById) {
      successfulMapCount++;
    } else {
      unmatchedRows.push(model);
    }

    // We want to track uniqueness by name + piece_type_name to see if they violate it
    // If the DB already has piece_type_id (because of dev/push), we track it by the mapped ID or name.
    const uniqueKey = `${model.model_name}-${ptValue}`;
    modelUniquenessTracker.set(uniqueKey, (modelUniquenessTracker.get(uniqueKey) || 0) + 1);

    if (modelUniquenessTracker.get(uniqueKey) === 2) {
        duplicateRows.push(model);
    }
  }

  console.log(`1. Total model rows: ${totalRows}`);
  console.log(`2. Successfully mapped rows: ${successfulMapCount}`);
  console.log(`3. Unmapped rows: ${unmatchedRows.length}`);
  console.log(`4. Duplicate models (violating unique constraint): ${duplicateRows.length}\n`);

  if (unmatchedRows.length > 0) {
    console.log("-----------------------------------------------------");
    console.log("❌ WARNING: UNMAPPED ROWS DETECTED");
    console.log("-----------------------------------------------------");
    console.log("The following models have 'piece_type' values that do not match any existing 'PieceType' name in the database.");
    console.log("These must be manually corrected in the live database BEFORE deploying the migration, otherwise the migration will intentionally ABORT and fail to prevent data corruption.\n");
    console.table(unmatchedRows);
  } else {
    console.log("✅ All legacy models perfectly match a valid piece type.");
  }

  if (duplicateRows.length > 0) {
    console.log("\n-----------------------------------------------------");
    console.log("❌ WARNING: DUPLICATE ROWS DETECTED");
    console.log("-----------------------------------------------------");
    console.log("The following models share the EXACT SAME model_name and piece_type.");
    console.log("This will violate the new composite unique constraint `@@unique([name, pieceTypeId])`.");
    console.log("These must be deduplicated, renamed, or assigned to a different piece type before migration.\n");
    console.table(duplicateRows);
  } else {
    console.log("✅ No duplicate models found within the same piece type.");
  }

  if (unmatchedRows.length === 0 && duplicateRows.length === 0) {
      console.log("\n🚀 THE DATABASE IS 100% READY FOR MIGRATION.");
  } else {
      console.log("\n🛑 THE DATABASE REQUIRES MANUAL CLEANUP BEFORE MIGRATION.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
