import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_RATE_BPS, percentToRateBps, rateBpsToPercent } from "@/lib/commission";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { firstZodMessage, settingsSchema } from "@/lib/validation";

function serializeSetting(commissionRateBps: number) {
  return {
    commissionRateBps,
    commissionRatePercent: rateBpsToPercent(commissionRateBps),
  };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const setting = await prisma.setting.findUnique({ where: { id: "default" } });
    return NextResponse.json(serializeSetting(setting?.commissionRateBps ?? DEFAULT_RATE_BPS));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const parsed = settingsSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    let commissionRateBps: number;
    try {
      commissionRateBps = percentToRateBps(parsed.data.commissionRatePercent);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid commission rate", 400);
    }

    const setting = await prisma.setting.upsert({
      where: { id: "default" },
      update: { commissionRateBps },
      create: { id: "default", commissionRateBps },
    });

    return NextResponse.json(serializeSetting(setting.commissionRateBps));
  } catch (error) {
    return handleRouteError(error);
  }
}
