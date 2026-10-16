import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        referralCode: true,
        createdAt: true,
        referredBy: { select: { id: true, name: true, email: true, referralCode: true } },
        _count: { select: { referrals: true } },
      },
    });

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        createdAt: user.createdAt.toISOString(),
        referralCount: user._count.referrals,
        referredBy: user.referredBy,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
