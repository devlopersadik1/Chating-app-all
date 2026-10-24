import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
function apiBase() {
  return (process.env.TALVIRO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");
}
async function token() { return (await cookies()).get("talviro_session")?.value; }

export async function GET() {
  const session = await token();
  if (!session) return NextResponse.json({ status: "error", message: "Not signed in" }, { status: 401 });
  try {
    const upstream = await fetch(`${apiBase()}/conversations`, { headers: { Authorization: `Bearer ${session}` }, cache: "no-store" });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { status: "error", message: "Invalid API response" }, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: "error", message: "Chat service is unavailable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const session = await token();
  if (!session) return NextResponse.json({ status: "error", message: "Not signed in" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ status: "error", message: "Invalid origin" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ status: "error", message: "Invalid JSON body" }, { status: 400 }); }
  try {
    const upstream = await fetch(`${apiBase()}/conversations`, {
      method: "POST", headers: { Authorization: `Bearer ${session}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { status: "error", message: "Invalid API response" }, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: "error", message: "Chat service is unavailable" }, { status: 502 });
  }
}