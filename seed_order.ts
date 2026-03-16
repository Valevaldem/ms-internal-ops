import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sa = await prisma.salesAssociate.findFirst();
  const lot = await prisma.stoneLot.findFirst();
  if (!sa || !lot) return;

  const q = await prisma.quotation.create({
    data: {
      folio: 'MS-1123-001-JP',
      clientNameOrUsername: 'Juan Perez',
      salesChannel: 'WhatsApp',
      salesAssociateId: sa.id,
      pieceType: 'Ring',
      modelName: 'Nova',
      modelBasePrice: 18000,
      totalStonesPrice: 4500,
      subtotalBeforeAdjustments: 22500,
      finalClientPrice: 22500,
      validUntil: new Date(),
      daysRemaining: 15,
      status: 'Converted',
      stones: {
        create: [
          { lotCode: lot.code, stoneName: lot.stoneName, weightCt: 1, pricePerCt: 4500, stoneSubtotal: 4500 }
        ]
      }
    }
  });

  await prisma.order.create({
    data: {
      quotationId: q.id,
      deliveryMethod: 'Store Pickup',
      isCertificatePending: true,
      stage: 'Por confirmar diseño final',
      stageHistory: {
        create: [
          { stage: 'Convertida a orden' },
          { stage: 'Por confirmar diseño final' }
        ]
      }
    }
  });

  const order2 = await prisma.order.create({
    data: {
      quotationId: (await prisma.quotation.create({
        data: {
          folio: 'MS-1123-002-MR',
          clientNameOrUsername: 'Maria Rodriguez',
          salesChannel: 'Store',
          salesAssociateId: sa.id,
          pieceType: 'Bracelet',
          modelName: 'Galaxy',
          modelBasePrice: 24000,
          totalStonesPrice: 0,
          subtotalBeforeAdjustments: 24000,
          finalClientPrice: 24000,
          validUntil: new Date(),
          daysRemaining: 15,
          status: 'Converted',
        }
      })).id,
      deliveryMethod: 'Shipping',
      isCertificatePending: false,
      stage: 'Producción',
      productionStartDate: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      estimatedProductionEnd: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000),
      stageHistory: {
        create: [
          { stage: 'Convertida a orden' },
          { stage: 'Por confirmar diseño final' },
          { stage: 'Producción' }
        ]
      }
    }
  });

  console.log("Mock orders created");
}

main().catch(console.error).finally(() => prisma.$disconnect());
