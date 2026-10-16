import { calculateCommissionCents, DEFAULT_RATE_BPS } from "./commission";
import { prisma } from "./prisma";

export async function createSimulatedOrder(buyerId: string, amountCents: number) {
  return prisma.$transaction(async (tx) => {
    const buyer = await tx.user.findUnique({
      where: { id: buyerId },
      select: { id: true, referredById: true },
    });
    if (!buyer) {
      throw new Error("Buyer not found");
    }

    const setting = await tx.setting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", commissionRateBps: DEFAULT_RATE_BPS },
    });

    const order = await tx.order.create({
      data: { buyerId: buyer.id, amountCents },
    });

    // Single level: credit only the buyer's direct referrer. Do not walk referredBy.referredBy.
    if (!buyer.referredById || buyer.referredById === buyer.id) {
      return { order, commission: null };
    }

    const commission = await tx.commission.create({
      data: {
        orderId: order.id,
        affiliateId: buyer.referredById,
        buyerId: buyer.id,
        rateBps: setting.commissionRateBps,
        amountCents: calculateCommissionCents(amountCents, setting.commissionRateBps),
      },
      include: {
        affiliate: { select: { id: true, name: true, referralCode: true } },
      },
    });

    return { order, commission };
  });
}
