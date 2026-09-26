const allowed = new Set([
  "https://imagenesypostales.com",
  "https://www.imagenesypostales.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

export function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://imagenesypostales.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin"
  };
}

export function json(req: Request, data: unknown, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {...corsHeaders(req),"Content-Type":"application/json; charset=utf-8"}
  });
}
