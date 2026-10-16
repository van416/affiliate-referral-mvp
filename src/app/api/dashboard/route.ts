import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_RATE_BPS } from "@/lib/commission";
import { handleRouteError, jsonError } from "@/lib/http";
import { appOrigin, referralLink } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);

    const [setting, referrals, commissions, orders] = await Promise.all([
      prisma.setting.findUnique({ where: { id: "default" } }),
      prisma.user.findMany({
        where: { referredById: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, referralCode: true, createdAt: true },
      }),
      prisma.commission.findMany({
        where: { affiliateId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          order: { select: { id: true, amountCents: true, createdAt: true } },
          buyer: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.order.findMany({
        where: { buyerId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          commission: {
            select: {
              amountCents: true,
              rateBps: true,
              affiliate: { select: { name: true, referralCode: true } },
            },
          },
        },
      }),
    ]);

    const commissionTotalCents = commissions.reduce((sum, row) => sum + row.amountCents, 0);
    const referredSalesCents = commissions.reduce((sum, row) => sum + row.order.amountCents, 0);

    return NextResponse.json({
      user: serializeUser(user),
      referralLink: referralLink(appOrigin(request), user.referralCode),
      commissionRateBps: setting?.commissionRateBps ?? DEFAULT_RATE_BPS,
      stats: {
        referralCount: referrals.length,
        commissionCount: commissions.length,
        commissionTotalCents,
        referredSalesCents,
      },
      referrals: referrals.map((referral) => ({
        ...referral,
        createdAt: referral.createdAt.toISOString(),
      })),
      commissions: commissions.map((commission) => ({
        id: commission.id,
        amountCents: commission.amountCents,
        rateBps: commission.rateBps,
        createdAt: commission.createdAt.toISOString(),
        order: {
          id: commission.order.id,
          amountCents: commission.order.amountCents,
          createdAt: commission.order.createdAt.toISOString(),
        },
        buyer: commission.buyer,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        amountCents: order.amountCents,
        createdAt: order.createdAt.toISOString(),
        commission: order.commission
          ? {
              amountCents: order.commission.amountCents,
              rateBps: order.commission.rateBps,
              affiliate: order.commission.affiliate,
            }
          : null,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
