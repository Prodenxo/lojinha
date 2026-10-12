import { API_URL } from "@/lib/api";

// Repassa /api/* para o backend, para o navegador nunca falar direto com ele.
async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${API_URL}/api/${path.join("/")}${new URL(req.url).search}`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = req.headers.get("x-admin-token");
  if (token) headers["x-admin-token"] = token;
  const authorization = req.headers.get("authorization");
  if (authorization) headers.authorization = authorization;

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json({ error: "Backend indisponível" }, { status: 503 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
