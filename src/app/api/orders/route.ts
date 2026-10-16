import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { createSimulatedOrder } from "@/lib/orders";
import { firstZodMessage, orderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = orderSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const result = await createSimulatedOrder(user.id, parsed.data.amountCents);
    return NextResponse.json(
      {
        order: {
          id: result.order.id,
          amountCents: result.order.amountCents,
          createdAt: result.order.createdAt.toISOString(),
        },
        commission: result.commission
          ? {
              id: result.commission.id,
              amountCents: result.commission.amountCents,
              rateBps: result.commission.rateBps,
              affiliate: result.commission.affiliate,
            }
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
