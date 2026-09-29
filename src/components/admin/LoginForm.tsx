"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginForm({ noAccounts }: { noAccounts: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Sign in failed");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <AuthCard title="Sign in" subtitle="Admin and sales team access.">
      {noAccounts ? (
        <div className="login-note">
          No admin account exists yet. Whoever manages the server creates the first one with:
          <code>node --env-file=.env.local --experimental-strip-types scripts/admin.mjs create you@company.com &quot;Your Name&quot;</code>
        </div>
      ) : null}
      <form className="login-form" onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        </div>
        {error ? <div className="login-error" role="alert">{error}</div> : null}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <Link className="login-link" href="/admin/forgot">Forgot password?</Link>
      </form>
    </AuthCard>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">VENTURE<span>.</span> / CONTROL</div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
