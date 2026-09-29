"use client";

import { useEffect, useState } from "react";
import type { VentureLayout } from "@/shared/layout";
import { PLOT_STATUSES, PlotStatus } from "@/shared/types";
import type { Venture } from "@/shared/ventures";

export interface Lead {
  id: number; slug: string; plot_number: string | null; kind: "enquiry" | "visit"; name: string; phone: string; email: string | null;
  visit_date: string | null; visit_slot: string | null; message: string | null; status: "new" | "contacted" | "visit" | "booked" | "lost";
  assigned_to: number | null; assigned_name: string | null; created_at: string;
}

export interface AuditEntry { id: number; userName: string; action: string; entity: string; entityId: string; summary: string; at: string }

export type Counts = Record<PlotStatus, number> & { total: number };

export function countPlots(l: VentureLayout | null | undefined): Counts | null {
  if (!l?.plots?.length) return null;
  const c = Object.fromEntries(PLOT_STATUSES.map((s) => [s, 0])) as Counts;
  for (const p of l.plots) c[p.status]++;
  c.total = l.plots.length;
  return c;
}

/** Every venture's published layout (null where none), keyed by slug. */
export function useLayouts(ventures: Venture[]) {
  const [layouts, setLayouts] = useState<Record<string, VentureLayout | null> | null>(null);
  const key = ventures.map((v) => v.slug).join(",");
  useEffect(() => {
    let stale = false;
    Promise.all(key.split(",").filter(Boolean).map(async (slug) => {
      const l: VentureLayout | null = await fetch(`/api/layouts/${slug}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      return [slug, l?.overlay ? l : null] as const;
    })).then((rows) => !stale && setLayouts(Object.fromEntries(rows)));
    return () => { stale = true; };
  }, [key]);
  return layouts;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const reload = () => fetch("/api/leads").then((r) => r.json()).then(setLeads).catch(() => setLeads([]));
  useEffect(() => { reload(); }, []);
  return { leads, setLeads, reload };
}

export function useAudit(query = "") {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    let stale = false;
    fetch(`/api/audit${query}`).then((r) => r.json()).then((j) => !stale && setRows(Array.isArray(j) ? j : [])).catch(() => setRows([]));
    return () => { stale = true; };
  }, [query]);
  return rows;
}

/** ISO timestamp `n` days ago (and today's date) — kept out of components so render stays pure. */
export const isoDaysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function timeAgo(iso: string) {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60e3);
  return m < 1 ? "just now" : m < 60 ? `${Math.round(m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}

/** Download rows as a CSV file (opens in Excel). */
export function downloadCsv(name: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
