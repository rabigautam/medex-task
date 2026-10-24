export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockRequest<T>(request: Request, operation: string, work: () => T | Promise<T>): Promise<T> {
  const url = new URL(request.url);
  const latency = Number(url.searchParams.get("latency") ?? process.env.NEXT_PUBLIC_MOCK_LATENCY ?? 350);
  if (Number.isFinite(latency) && latency > 0) await delay(Math.min(latency, 10000));

  const failQuery = url.searchParams.get("fail");
  const failHeader = request.headers.get("x-mock-fail");
  const shouldFail = failQuery === "1" || failHeader === operation || failHeader === "*";
  if (shouldFail) throw new MockFailure("Simulated network/server failure", 500);
  if (url.searchParams.get("offline") === "1") throw new MockFailure("Simulated offline state", 503);
  return await work();
}

export class MockFailure extends Error {
  status: number;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}

export function jsonError(error: unknown) {
  const status = error instanceof MockFailure ? error.status : 409;
  const message = error instanceof Error ? error.message : "Unexpected request failure.";
  return Response.json({ error: message }, { status });
}
