import { ZodError } from "zod";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export function uploadError(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError) return jsonError("入力内容が無効です。", 400);
  return jsonError("ストレージ処理に失敗しました。時間をおいて再度お試しください。", 503);
}
export function isSameOriginJson(request: Request) {
  const origin = request.headers.get("origin");
  return (!origin || origin === new URL(request.url).origin) && request.headers.get("content-type")?.split(";")[0].trim() === "application/json";
}
