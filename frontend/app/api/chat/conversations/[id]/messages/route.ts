import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
function apiBase() {
  return (process.env.TALVIRO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");
}
async function sessionToken() { return (await cookies()).get("talviro_session")?.value; }

export async function GET(request: NextRequest, context: Context) {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ status: "error", message: "Not signed in" }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ status: "error", message: "Invalid conversation ID" }, { status: 400 });
  const params = new URLSearchParams();
  const before = request.nextUrl.searchParams.get("before_id");
  const limit = request.nextUrl.searchParams.get("limit");
  if (before) params.set("before_id", before);
  if (limit) params.set("limit", limit);
  try {
    const suffix = params.size ? `?${params.toString()}` : "";
    const upstream = await fetch(`${apiBase()}/conversations/${id}/messages${suffix}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { status: "error", message: "Invalid API response" }, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: "error", message: "Chat service is unavailable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ status: "error", message: "Not signed in" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ status: "error", message: "Invalid origin" }, { status: 403 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ status: "error", message: "Invalid conversation ID" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ status: "error", message: "Invalid JSON body" }, { status: 400 }); }
  try {
    const upstream = await fetch(`${apiBase()}/conversations/${id}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { status: "error", message: "Invalid API response" }, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: "error", message: "Chat service is unavailable" }, { status: 502 });
  }
}