import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function apiBase() {
  return (process.env.TALVIRO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000/api/v1").replace(/\/$/, "");
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("talviro_session")?.value;
  if (!token) return NextResponse.json({ status: "error", message: "Not signed in" }, { status: 401 });
  try {
    const upstream = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const response = NextResponse.json({ status: "error", message: "Session expired. Please sign in again." }, { status: 401 });
      response.cookies.delete("talviro_session");
      return response;
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "error", message: "Authentication service is unavailable" }, { status: 502 });
  }
}