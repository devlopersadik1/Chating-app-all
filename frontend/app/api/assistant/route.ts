import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 12) return NextResponse.json({ message: "Send 1–12 messages" }, { status: 400 });
  const messages = body.messages.map((item: any) => {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 2000) throw new Error("INVALID_MESSAGES");
    return { role: item.role, content: item.content.trim() };
  });
  if (messages[messages.length - 1].role !== "user") return NextResponse.json({ message: "Last message must be from the user" }, { status: 400 });
  const key = process.env.TALVIRO_AI_API_KEY;
  const model = process.env.TALVIRO_AI_MODEL;
  const endpoint = process.env.TALVIRO_AI_API_URL || "https://api.openai.com/v1/chat/completions";
  if (!key || !model) return NextResponse.json({ message: "AI service is not configured yet. Add provider settings on the server." }, { status: 503 });
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, messages: [{ role: "system", content: "You are Talviro AI, a helpful assistant for using Talviro Chat, account settings, privacy and general questions. Be concise and honest. Never ask for passwords, OTPs or API keys. Do not claim to access private chats or perform account actions." }, ...messages], max_tokens: 700 }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store"
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json({ message: upstream.status === 429 ? "AI service is busy. Try again shortly." : "AI service could not answer right now." }, { status: upstream.status === 429 ? 429 : 502 });
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return NextResponse.json({ message: "AI returned an empty response" }, { status: 502 });
    return NextResponse.json({ reply: reply.trim() });
  } catch {
    return NextResponse.json({ message: "Could not reach the AI service. Please try again." }, { status: 502 });
  }
}