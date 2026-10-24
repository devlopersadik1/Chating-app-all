"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, MessageCircle } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not sign in.");
      window.location.assign("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow" />
      <Link className="brand auth-brand" href="/"><span className="brand-mark"><MessageCircle size={20}/></span><span>talviro<span className="brand-dot">.</span></span></Link>
      <section className="auth-card">
        <div className="auth-symbol"><LockKeyhole size={22}/></div>
        <div className="eyebrow">Welcome back</div>
        <h1>Good to see you.</h1>
        <p className="auth-copy">Sign in to continue your conversations.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email or username<input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} required maxLength={190} placeholder="you@example.com"/></label>
          <label>Password<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={72} placeholder="Enter your password"/></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button-primary auth-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ArrowRight size={16}/></button>
        </form>
        <p className="auth-switch">New to Talviro? <Link href="/register">Create an account</Link></p>
        <p className="auth-foot">Your sign-in token is kept in a secure, HTTP-only cookie.</p>
      </section>
      <Link className="auth-back" href="/">← Back to Talviro</Link>
    </main>
  );
}