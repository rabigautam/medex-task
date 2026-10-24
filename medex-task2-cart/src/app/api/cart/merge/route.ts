import { getGuestCart, mergeGuestItems } from "@/lib/cart-store";
import { jsonError, mockRequest } from "@/lib/mock-api";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : getGuestCart();
    const result = await mockRequest(request, "POST:/api/cart/merge", () => mergeGuestItems(items));
    return Response.json(result);
  } catch (error) { return jsonError(error); }
}
