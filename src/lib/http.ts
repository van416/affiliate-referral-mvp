export class BadRequestError extends Error {}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BadRequestError("Request body must be JSON");
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof BadRequestError) {
    return jsonError(error.message, 400);
  }
  console.error(error);
  return jsonError("Something went wrong", 500);
}
