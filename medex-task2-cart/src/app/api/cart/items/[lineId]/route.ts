import { removeItem, updateQuantity, updateWellness } from "@/lib/cart-store";
import { jsonError, mockRequest } from "@/lib/mock-api";

export async function PATCH(request: Request, context: { params: Promise<{ lineId: string }> }) {
  try {
    const { lineId } = await context.params;
    const body = await request.json();
    const cart = await mockRequest(request, "PATCH:/api/cart/items", () => {
      if (typeof body.quantity === "number") {
        const result = updateQuantity(lineId, body.quantity);
        if (!result) throw new Error("Cart item not found.");
        return result;
      }
      if (typeof body.wellnessPricingId === "string") {
        const result = updateWellness(lineId, body.wellnessPricingId);
        if (!result) throw new Error("Cart item not found.");
        return result;
      }
      throw new Error("Provide quantity or wellnessPricingId.");
    });
    return Response.json({ cart });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ lineId: string }> }) {
  try {
    const { lineId } = await context.params;
    const removed = await mockRequest(request, "DELETE:/api/cart/items", () => removeItem(lineId));
    if (!removed) return Response.json({ error: "Cart item not found." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) { return jsonError(error); }
}
