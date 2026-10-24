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
  const { name, username, email, password } = input;
  if (typeof name !== "string" || typeof username !== "string" || typeof email !== "string" || typeof password !== "string" ||
      name.trim().length < 2 || name.trim().length > 100 ||
      !/^[a-zA-Z0-9_]{3,30}$/.test(username) ||
      email.trim().length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 10 || password.length > 72) {
    return NextResponse.json({ status: "error", message: "Check your name, username, email and password requirements" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${apiBase()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), username: username.toLowerCase(), email: email.trim().toLowerCase(), password }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null) as { status?: string; message?: string; token?: string; user?: unknown } | null;
    if (!upstream.ok || !data?.token || !data.user) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Registration failed" },
        { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 },
      );
    }

    const response = NextResponse.json({ status: "ok", user: data.user }, { status: 201 });
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