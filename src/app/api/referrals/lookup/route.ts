import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!code) return NextResponse.json({ valid: false });

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { name: true, referralCode: true },
  });

  if (!referrer) return NextResponse.json({ valid: false });
  return NextResponse.json({
    valid: true,
    referrer: { name: referrer.name, referralCode: referrer.referralCode },
  });
}
