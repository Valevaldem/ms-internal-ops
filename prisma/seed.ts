import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with MVP catalogs...')

  // 1. Sales Associates
  await prisma.salesAssociate.createMany({
    data: [
      { name: 'Ana M', activeStatus: true, appliesMsAdjustment: true },
      { name: 'Carlos S', activeStatus: true, appliesMsAdjustment: false },
    ],
  })

  // 2. Models
  await prisma.model.createMany({
    data: [
      { name: 'Anillo Clásico Solitario', pieceType: 'Ring', basePrice: 12000, activeStatus: true },
      { name: 'Argolla Diamantes', pieceType: 'Ring', basePrice: 18500, activeStatus: true },
      { name: 'Cadena Fina Oro 18k', pieceType: 'Chain', basePrice: 8000, activeStatus: true },
      { name: 'Aretes Perla', pieceType: 'Earrings', basePrice: 6500, activeStatus: true },
    ],
  })

  // 3. Stone Lots
  await prisma.stoneLot.createMany({
    data: [
      { code: 'D-001', stoneName: 'Diamante Natural', cut: 'Brillante', color: 'G', pricePerCt: 85000, activeStatus: true },
      { code: 'D-002', stoneName: 'Diamante Lab', cut: 'Princesa', color: 'F', pricePerCt: 25000, activeStatus: true },
      { code: 'Z-001', stoneName: 'Zafiro Azul', cut: 'Oval', color: 'Azul', pricePerCt: 32000, activeStatus: true },
      { code: 'E-001', stoneName: 'Esmeralda Colombiana', cut: 'Esmeralda', color: 'Verde', pricePerCt: 45000, activeStatus: true },
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
