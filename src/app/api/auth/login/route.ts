import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { attachSession } from "@/lib/auth";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/serializers";
import { firstZodMessage, loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: {
        referredBy: { select: { id: true, name: true, referralCode: true } },
      },
    });

    const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      return jsonError("Invalid email or password", 401);
    }

    const response = NextResponse.json({ user: serializeUser(user) });
    await attachSession(response, request, user.id);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
