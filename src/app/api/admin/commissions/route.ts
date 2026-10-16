import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const commissions = await prisma.commission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { id: true, amountCents: true, createdAt: true } },
        affiliate: { select: { id: true, name: true, email: true, referralCode: true } },
        buyer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      totalCents: commissions.reduce((sum, row) => sum + row.amountCents, 0),
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
        affiliate: commission.affiliate,
        buyer: commission.buyer,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
