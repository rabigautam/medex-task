import { getCart } from "@/lib/cart-store";
import { jsonError, mockRequest } from "@/lib/mock-api";

export async function GET(request: Request) {
  try {
    const cart = await mockRequest(request, "GET:/api/cart", getCart);
    return Response.json({ cart });
  } catch (error) { return jsonError(error); }
}
