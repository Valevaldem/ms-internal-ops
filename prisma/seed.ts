import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/*
  ==============================================================
  DATABASE SETUP & BOOTSTRAP INTENT (PLEASE READ)
  ==============================================================
  1. This seed file exists ONLY for reproducible local setup.
  2. The schema, seed file, and .env.example are the setup baseline.
  3. Seeded records are NOT the business workflow source of truth.
  4. Implementation MUST follow the actual, verified app flow, NOT
     invented hardcoded demo business records.
  5. Do NOT depend on a manually modified local dev.db snapshot.

  This file should only insert neutral catalogs (associates, models,
  stones) to get the app running, avoiding fake quotations or orders.
  ==============================================================
*/

async function main() {
  console.log('Seeding database with operational catalogs...')

  // 1. Sales Associates
  await prisma.salesAssociate.createMany({
    data: [
      { name: 'MS', activeStatus: true, appliesMsAdjustment: true },
      { name: 'Fernanda Pérez', activeStatus: true, appliesMsAdjustment: false },
    ],
  })

  // 2. Models
  await prisma.model.createMany({
    data: [
      { name: 'Nova', pieceType: 'Ring', basePrice: 18000, activeStatus: true },
      { name: 'Galaxy', pieceType: 'Ring', basePrice: 24000, activeStatus: true },
      { name: 'Atom', pieceType: 'Ring', basePrice: 16000, activeStatus: true },
    ],
  })

  // 3. Stone Lots
  await prisma.stoneLot.createMany({
    data: [
      { code: 'TU-B070', stoneName: 'Turmalina', cut: 'Trillon', color: 'Multicolor', pricePerCt: 4500, activeStatus: true },
      { code: 'AB018', stoneName: 'Amatista', cut: 'Octagón', color: 'Morado', pricePerCt: 2100, activeStatus: true },
      { code: 'AC-B007', stoneName: 'Amatista clara', cut: 'Cushion', color: 'Lila', pricePerCt: 2100, activeStatus: true },
      { code: 'TA-B008', stoneName: 'Tanzanita', cut: 'Marquise', color: 'Tanzanita', pricePerCt: 4500, activeStatus: true },
      { code: 'E-005', stoneName: 'Esmeralda', cut: 'Oval', color: 'Verde', pricePerCt: 11000, activeStatus: true },
      { code: 'AQ-009', stoneName: 'Aquamarina', cut: 'Gota', color: 'Celeste', pricePerCt: 4000, activeStatus: true },
      { code: 'R-002', stoneName: 'Rubí', cut: 'Redondo', color: 'Fucsia', pricePerCt: 2200, activeStatus: true },
    ],
  })

  console.log('Seed completed successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
