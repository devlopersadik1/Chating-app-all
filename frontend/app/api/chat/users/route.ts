import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const session = (await cookies()).get("talviro_session")?.value;
  if (!session) return NextResponse.json({ status: "error", message: "Not signed in" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2 || q.length > 60) return NextResponse.json({ status: "error", message: "Search must be 2–60 characters" }, { status: 400 });
  const base = (process.env.TALVIRO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");
  try {
    const upstream = await fetch(`${base}/users/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${session}` }, cache: "no-store" });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { status: "error", message: "Invalid API response" }, { status: upstream.status });
  } catch {
    return NextResponse.json({ status: "error", message: "Chat service is unavailable" }, { status: 502 });
  }
}