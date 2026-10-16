import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { publicUserSelect, type PublicUserRecord } from "./serializers";
import { jsonError } from "./http";

const COOKIE_NAME = "firstlink_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set and at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

function isSecureRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return new URL(request.url).protocol === "https:";
}

function cookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(request),
    path: "/",
    maxAge,
  };
}

export async function signSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function attachSession(response: NextResponse, request: Request, userId: string) {
  const token = await signSession(userId);
  response.cookies.set(COOKIE_NAME, token, cookieOptions(request, 60 * 60 * 24 * 7));
  return response;
}

export function clearSession(response: NextResponse, request: Request) {
  response.cookies.set(COOKIE_NAME, "", cookieOptions(request, 0));
  return response;
}

async function readSessionUserId() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<PublicUserRecord | null> {
  const id = await readSessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { user: null, response: jsonError("Unauthorized", 401) };
  if (user.role !== "ADMIN") return { user: null, response: jsonError("Forbidden", 403) };
  return { user, response: null };
}
