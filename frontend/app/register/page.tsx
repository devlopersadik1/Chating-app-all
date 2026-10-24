"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, MessageCircle, UserRoundPlus } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create your account.");
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
        <div className="auth-symbol"><UserRoundPlus size={22}/></div>
        <div className="eyebrow">Your next conversation starts here</div>
        <h1>Make it yours.</h1>
        <p className="auth-copy">Create your Talviro account in a few steps.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Display name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Your name"/></label>
          <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]{3,30}" placeholder="your_username"/><small>3–30 letters, numbers or underscores.</small></label>
          <label>Email address<input autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value.trim())} required maxLength={190} placeholder="you@example.com"/></label>
          <label>Password<input autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} maxLength={72} placeholder="At least 10 characters"/><small>Use a unique password with at least 10 characters.</small></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button-primary auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create account"} <ArrowRight size={16}/></button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
        <p className="auth-foot">Phone OTP and email verification are not enabled yet.</p>
      </section>
      <Link className="auth-back" href="/">← Back to Talviro</Link>
    </main>
  );
}