"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, MessageCircle, ShieldCheck, UserRound } from "lucide-react";

type User = { id: number; name: string; username: string; email: string };

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Session expired");
        return data.user as User;
      })
      .then(value => { if (alive) { setUser(value); setState("ready"); } })
      .catch(() => { if (alive) { setState("error"); window.location.replace("/login"); } });
    return () => { alive = false; };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <main className="account-shell">
      <header className="account-top"><Link className="brand" href="/"><span className="brand-mark"><MessageCircle size={20}/></span><span>talviro<span className="brand-dot">.</span></span></Link><button className="account-logout" onClick={logout}><LogOut size={15}/> Sign out</button></header>
      <section className="account-card">
        <div className="auth-symbol"><UserRound size={22}/></div>
        <div className="eyebrow">Your Talviro account</div>
        <h1>{state === "loading" ? "Loading your account…" : state === "error" ? "Session ended" : `Welcome, ${user?.name}.`}</h1>
        {user && <><p className="auth-copy">Your account was authenticated by the Talviro API.</p><div className="account-detail"><span>Username</span><b>@{user.username}</b></div><div className="account-detail"><span>Email</span><b>{user.email}</b></div><div className="account-detail"><span>Account ID</span><b>{user.id}</b></div></>}
        <div className="account-notice"><ShieldCheck size={17}/><span>This is an authentication milestone. Real conversations, profile editing and calling are still under development.</span></div>
        <Link href="/" className="button-primary account-home">Return to home <MessageCircle size={15}/></Link>
      </section>
    </main>
  );
}