import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { attachSession } from "@/lib/auth";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { randomReferralCode } from "@/lib/referral";
import { publicUserSelect, serializeUser } from "@/lib/serializers";
import { firstZodMessage, registerSchema } from "@/lib/validation";

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const name = parsed.data.name;
    const email = parsed.data.email;
    const password = parsed.data.password;
    const referralCodeInput = parsed.data.referralCode?.trim().toUpperCase() || null;

    if (bcrypt.truncates(password)) {
      return jsonError("Password is too long", 400);
    }

    let referredById: string | null = null;
    if (referralCodeInput) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCodeInput },
        select: { id: true },
      });
      if (!referrer) return jsonError("Referral code was not found", 400);
      referredById = referrer.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            referralCode: randomReferralCode(),
            referredById,
          },
          select: publicUserSelect,
        });
        const response = NextResponse.json({ user: serializeUser(user) }, { status: 201 });
        await attachSession(response, request, user.id);
        return response;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const target = uniqueTarget(error);
          if (target.some((field) => field.includes("email"))) {
            return jsonError("An account with that email already exists", 409);
          }
          if (target.some((field) => field.includes("referralCode"))) continue;
        }
        throw error;
      }
    }

    return jsonError("Could not create an account. Try again.", 500);
  } catch (error) {
    return handleRouteError(error);
  }
}
