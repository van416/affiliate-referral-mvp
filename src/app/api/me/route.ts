import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { serializeUser } from "@/lib/serializers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  return NextResponse.json({ user: serializeUser(user) });
}
