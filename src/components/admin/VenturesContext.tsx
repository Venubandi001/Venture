"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Venture } from "@/shared/ventures";

interface Ctx {
  ventures: Venture[];
  loaded: boolean;
  bySlug: (slug: string) => Venture | undefined;
  reload: () => Promise<void>;
}

const VenturesContext = createContext<Ctx | null>(null);

/** One shared, database-backed venture list for every admin screen (refreshed after edits). */
export function VenturesProvider({ children }: { children: React.ReactNode }) {
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = () => fetch("/api/ventures", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const reload = useCallback(async () => {
    const v = await load();
    if (v) setVentures(v);
  }, []);
  useEffect(() => {
    load().then((v) => { if (v) setVentures(v); setLoaded(true); });
  }, []);
  const bySlug = useCallback((slug: string) => ventures.find((v) => v.slug === slug), [ventures]);
  return <VenturesContext.Provider value={{ ventures, loaded, bySlug, reload }}>{children}</VenturesContext.Provider>;
}

export function useVentures() {
  const c = useContext(VenturesContext);
  if (!c) throw new Error("useVentures must be used inside VenturesProvider");
  return c;
}

/** Venture picker used on several admin screens. */
export function VentureSelect({ value, onChange, className }: { value: string; onChange: (slug: string) => void; className?: string }) {
  const { ventures } = useVentures();
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Venture">
      {ventures.map((v) => (
        <option key={v.slug} value={v.slug}>{v.name}{v.status === "live" ? "" : ` (${v.status.replace("_", " ")})`}</option>
      ))}
    </select>
  );
}
