"use client";

import { useEffect, useState } from "react";
import type { Role, User } from "@/shared/users";
import { useToast } from "../ToastProvider";

interface Row { id: number; email: string; name: string; role: Role; active: boolean; mustChangePassword: boolean; created_at: string }

const call = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

export default function UsersView({ me }: { me: User }) {
  const showToast = useToast();
  const [users, setUsers] = useState<Row[]>([]);
  const [form, setForm] = useState({ name: "", email: "", role: "sales" as Role });
  const [secret, setSecret] = useState<{ name: string; email: string; password: string } | null>(null);

  const load = () => fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => showToast("Could not load users"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(r: Response, ok?: string) {
    if (!r.ok) {
      showToast((await r.json().catch(() => ({}))).error ?? "Something went wrong");
      return null;
    }
    if (ok) showToast(ok);
    load();
    return r.json().catch(() => ({}));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const j = await act(await call("/api/users", "POST", form));
    if (j?.tempPassword) {
      setSecret({ name: form.name, email: form.email, password: j.tempPassword });
      setForm({ name: "", email: "", role: "sales" });
    }
  }

  async function reset(u: Row) {
    if (!confirm(`Reset ${u.name}'s password? They'll be signed out and must set a new one.`)) return;
    const j = await act(await call(`/api/users/${u.id}/reset-password`, "POST"));
    if (j?.tempPassword) setSecret({ name: u.name, email: u.email, password: j.tempPassword });
  }

  async function setActive(u: Row, active: boolean) {
    if (!active && !confirm(`Deactivate ${u.name}? They're signed out immediately; their leads and history stay.`)) return;
    await act(await call(`/api/users/${u.id}`, "PATCH", { active }), active ? `${u.name} can sign in again` : `${u.name} deactivated`);
  }

  const setRole = async (u: Row, role: Role) => act(await call(`/api/users/${u.id}`, "PATCH", { role }), `${u.name} is now ${role}`);

  return (
    <section>
      <div className="eyebrow">Operations / Access</div>
      <h1>Users & roles</h1>
      <p style={{ color: "#7b867f" }}>
        <b>Admin</b>: everything, including layouts and users. <b>Sales</b>: leads and plot statuses only.
        Deactivate people who leave — it signs them out and keeps their history.
      </p>

      {secret ? (
        <div className="card secret-card" role="alert">
          <div>
            <b>One-time password for {secret.name}</b>
            <p>Shown only once. Share it privately; they must choose their own password at first sign-in.</p>
          </div>
          <code>{secret.password}</code>
          <div className="le-row">
            <button className="btn" onClick={() => navigator.clipboard.writeText(`Sign in at ${location.origin}/admin with ${secret.email} and this one-time password: ${secret.password}`).then(() => showToast("Copied"))}>Copy</button>
            <button className="btn ghost" onClick={() => setSecret(null)}>Done</button>
          </div>
        </div>
      ) : null}

      <div className="grid2">
        <div className="card">
          <div className="cardhead"><b>Team</b><span>{users.filter((u) => u.active).length} active</span></div>
          <table className="inventory">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className={u.active ? "" : "row-inactive"}>
                    <td><b>{u.name}</b>{self ? " (you)" : ""}</td>
                    <td>{u.email}</td>
                    <td>
                      {self ? <span className="badge confirmed">{u.role}</span> : (
                        <select className="inv-select" value={u.role} onChange={(e) => setRole(u, e.target.value as Role)} aria-label={`Role of ${u.name}`}>
                          <option value="sales">sales</option><option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {!u.active ? <span className="badge sold">Deactivated</span>
                        : u.mustChangePassword ? <span className="badge hold">Awaiting first sign-in</span>
                        : <span className="badge available">Active</span>}
                    </td>
                    <td className="user-actions">
                      {!self ? (
                        <>
                          {u.active ? <button className="tab" onClick={() => reset(u)}>Reset password</button> : null}
                          <button className="tab" onClick={() => setActive(u, !u.active)}>{u.active ? "Deactivate" : "Activate"}</button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form className="card le-stack" onSubmit={add}>
          <div className="cardhead"><b>Add a team member</b></div>
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="field"><label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="sales">Sales</option><option value="admin">Admin</option></select>
          </div>
          <small className="le-muted">A one-time password is generated for them — no need to invent one.</small>
          <button className="btn">Add user</button>
        </form>
      </div>
    </section>
  );
}
