"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PASSWORD_MIN } from "@/shared/users";
import { AuthCard } from "./LoginForm";

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const errorOf = async (r: Response) => (await r.json().catch(() => ({}))).error ?? "Something went wrong — please try again";
const HINT = `At least ${PASSWORD_MIN} characters, with letters and a number.`;

function NewPasswordFields({ value, onChange }: { value: { next: string; again: string }; onChange: (v: { next: string; again: string }) => void }) {
  return (
    <>
      <div className="field">
        <label>New password</label>
        <input type="password" minLength={PASSWORD_MIN} autoComplete="new-password" value={value.next} onChange={(e) => onChange({ ...value, next: e.target.value })} required />
        <small className="login-hint">{HINT}</small>
      </div>
      <div className="field">
        <label>Repeat new password</label>
        <input type="password" autoComplete="new-password" value={value.again} onChange={(e) => onChange({ ...value, again: e.target.value })} required />
      </div>
    </>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "no-email">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const r = await post("/api/auth/forgot", { email });
    setState((await r.json().catch(() => ({}))).email === false ? "no-email" : "sent");
  }

  return (
    <AuthCard title="Forgot password" subtitle="Enter the email you sign in with.">
      {state === "sent" ? (
        <div className="login-note ok">If an account exists for <b>{email}</b>, we’ve sent a link to reset the password. It works once, for 30 minutes. Check spam too.</div>
      ) : state === "no-email" ? (
        <div className="login-note">Password emails aren’t set up yet. Ask your administrator to reset your password from <b>Users &amp; Roles</b> — you’ll get a one-time password.</div>
      ) : (
        <form className="login-form" onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <button className="btn" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <Link className="login-link" href="/admin/login">← Back to sign in</Link>
    </AuthCard>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState({ next: "", again: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.again) return setError("The two passwords don’t match");
    setBusy(true);
    const r = await post("/api/auth/reset", { token, password: pw.next });
    setBusy(false);
    if (!r.ok) return setError(await errorOf(r));
    setDone(true);
  }

  return (
    <AuthCard title="Choose a new password">
      {!token ? (
        <div className="login-error">This reset link is incomplete. Request a new one.</div>
      ) : done ? (
        <div className="login-note ok">Password changed. You’ve been signed out on all devices.</div>
      ) : (
        <form className="login-form" onSubmit={submit}>
          <NewPasswordFields value={pw} onChange={setPw} />
          {error ? <div className="login-error" role="alert">{error}</div> : null}
          <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
        </form>
      )}
      <Link className="login-link" href={done ? "/admin/login" : "/admin/forgot"}>{done ? "Sign in →" : "Request a new link"}</Link>
    </AuthCard>
  );
}

/** Own password change. `forced` = shown full-page right after signing in with a one-time password. */
export function ChangePasswordForm({ forced, name, onDone }: { forced?: boolean; name?: string; onDone?: () => void }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState({ next: "", again: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.again) return setError("The two passwords don’t match");
    setBusy(true);
    const r = await post("/api/auth/change-password", { current, next: pw.next });
    setBusy(false);
    if (!r.ok) return setError(await errorOf(r));
    onDone?.();
    router.refresh();
  }

  const form = (
    <form className="login-form" onSubmit={submit}>
      <div className="field">
        <label>{forced ? "One-time password" : "Current password"}</label>
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <NewPasswordFields value={pw} onChange={setPw} />
      {error ? <div className="login-error" role="alert">{error}</div> : null}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Set password"}</button>
    </form>
  );

  if (!forced) return form;
  return (
    <AuthCard title="Set your own password" subtitle={`Welcome${name ? `, ${name}` : ""}. You signed in with a one-time password — choose your own to continue.`}>
      {form}
      <button className="login-link as-button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }}>
        Sign out
      </button>
    </AuthCard>
  );
}
