import { checkoutGroup } from "@/lib/cart-store";
import { jsonError, mockRequest } from "@/lib/mock-api";
import type { PaymentMethod } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const order = await mockRequest(request, "POST:/api/checkout", () => {
      if (typeof body.groupType !== "string" || typeof body.idempotencyKey !== "string") {
        throw new Error("groupType and idempotencyKey are required.");
      }
      if (!["card", "pay_at_clinic"].includes(body.paymentMethod)) throw new Error("Choose a payment method.");
      return checkoutGroup(body.groupType, body.paymentMethod as PaymentMethod, body.idempotencyKey);
    });
    return Response.json({ orderId: order.orderId, status: order.status }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
