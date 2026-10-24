import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function apiBase() {
  return (process.env.TALVIRO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000/api/v1").replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ status: "error", message: "Invalid request" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.identifier !== "string" || typeof input.password !== "string" ||
      input.identifier.length < 1 || input.identifier.length > 190 ||
      input.password.length < 1 || input.password.length > 72) {
    return NextResponse.json({ status: "error", message: "Email/username and password are required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${apiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: input.identifier, password: input.password }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null) as { status?: string; message?: string; token?: string; user?: unknown } | null;
    if (!upstream.ok || !data?.token || !data.user) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Sign-in failed" },
        { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 },
      );
    }

    const response = NextResponse.json({ status: "ok", user: data.user });
    response.cookies.set("talviro_session", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ status: "error", message: "Authentication service is unavailable" }, { status: 502 });
  }
}