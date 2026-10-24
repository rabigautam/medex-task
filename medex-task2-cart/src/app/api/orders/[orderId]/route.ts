import { getOrder } from "@/lib/cart-store";
import { jsonError, mockRequest } from "@/lib/mock-api";

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const order = await mockRequest(request, "GET:/api/orders", () => getOrder(orderId));
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    return Response.json({ orderId: order.orderId, status: order.status });
  } catch (error) { return jsonError(error); }
}
