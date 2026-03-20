import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
  // Clear existing lots first to avoid unique constraint issues if we re-seed
  await prisma.stoneLot.deleteMany({});
  await prisma.stoneLot.createMany({
    data: [
      { code: 'TU-B070', stoneName: 'Turmalina', cut: 'Trillon', color: 'Multicolor', pricePerCt: 4500, activeStatus: true, pricingMode: 'CT' },
      { code: 'AB018', stoneName: 'Amatista', cut: 'Octagón', color: 'Morado', pricePerCt: 2100, activeStatus: true, pricingMode: 'CT' },
      { code: 'AC-B007', stoneName: 'Amatista clara', cut: 'Cushion', color: 'Lila', pricePerCt: 2100, activeStatus: true, pricingMode: 'CT' },
      { code: 'TA-B008', stoneName: 'Tanzanita', cut: 'Marquise', color: 'Tanzanita', pricePerCt: 4500, activeStatus: true, pricingMode: 'CT' },
      { code: 'E-005', stoneName: 'Esmeralda', cut: 'Oval', color: 'Verde', pricePerCt: 11000, activeStatus: true, pricingMode: 'CT' },
      { code: 'AQ-009', stoneName: 'Aquamarina', cut: 'Gota', color: 'Celeste', pricePerCt: 4000, activeStatus: true, pricingMode: 'CT' },
      { code: 'R-002', stoneName: 'Rubí', cut: 'Redondo', color: 'Fucsia', pricePerCt: 2200, activeStatus: true, pricingMode: 'CT' },
      // Added Z-001 for Piece (PZ) pricing mode test
      { code: 'Z-001', stoneName: 'Zafiro', cut: 'Oval', color: 'Azul', pricePerCt: 15000, activeStatus: true, pricingMode: 'PZ' },
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
