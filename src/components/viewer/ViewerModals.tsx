"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { formatInr, plotPrice, VentureLayout } from "@/shared/layout";
import type { VentureCard } from "@/shared/ventures";
import { useToast } from "../ToastProvider";

function Shell({ onClose, className = "", children }: { onClose: () => void; className?: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="pv-modal-bg" onClick={onClose}>
      <div className={`pv-modal ${className}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="pv-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

export function InfoModal({ venture, layout, others, onClose }: {
  venture: VentureCard;
  layout: VentureLayout;
  others: VentureCard[];
  onClose: () => void;
}) {
  const prices = layout.plots.filter((p) => p.status === "available").map((p) => plotPrice(layout, p)).filter((v): v is number => v !== null);
  const available = layout.plots.filter((p) => p.status === "available").length;
  return (
    <Shell onClose={onClose} className="pv-info">
      <div className="pv-info-brand">
        <span className="pv-logo big">{venture.logo}</span>
        <span className="pv-name big">{venture.name.toUpperCase()}</span>
      </div>
      {layout.approvals.length ? (
        <div className="pv-badges">{layout.approvals.map((a) => <span key={a}>✓ {a}</span>)}</div>
      ) : null}
      {layout.plots.length ? (
        <div className="pv-facts">
          <div><b>{available}</b><small>of {layout.plots.length} plots available</small></div>
          {prices.length ? <div><b>{formatInr(Math.min(...prices))}</b><small>starting price</small></div> : null}
          {layout.ratePerSqYd ? <div><b>₹{layout.ratePerSqYd.toLocaleString("en-IN")}</b><small>per Sq.Yd</small></div> : null}
        </div>
      ) : null}
      <p>{layout.description || `${venture.name} · ${venture.loc}`}</p>
      {layout.nearby.some((n) => n.name) ? (
        <>
          <h4>Location advantages</h4>
          <ul className="pv-nearby">
            {layout.nearby.filter((n) => n.name).map((n) => <li key={n.name}><span>{n.name}</span><b>{n.distance}</b></li>)}
          </ul>
        </>
      ) : null}
      {others.length ? (
        <>
          <hr />
          <h4>Other ventures</h4>
          <div className="pv-others">
            {others.map((v) => (
              <Link key={v.slug} href={`/explore/${v.slug}`} className="pv-other">
                <span className="pv-logo">{v.logo}</span>
                <b>{v.name}</b>
                <small>{v.loc}</small>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}

export function ShareModal({ slug, name, plotNumber, onClose }: { slug: string; name: string; plotNumber: string | null; onClose: () => void }) {
  const showToast = useToast();
  const [withStatus, setWithStatus] = useState(true);
  const [withPlot, setWithPlot] = useState(!!plotNumber);
  const [qr, setQr] = useState("");
  const q = new URLSearchParams();
  if (withStatus) q.set("status", "1");
  if (withPlot && plotNumber) q.set("plot", plotNumber);
  const url = `${typeof window === "undefined" ? "" : window.location.origin}/explore/${slug}${q.size ? `?${q}` : ""}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 440, margin: 1 }).then(setQr);
  }, [url]);

  async function shareLink() {
    if (navigator.share) return navigator.share({ title: name, url }).catch(() => {});
    await navigator.clipboard.writeText(url);
    showToast("Link copied");
  }

  return (
    <Shell onClose={onClose} className="pv-share">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt={`QR code for ${name}`} />
      ) : <div className="pv-qr-ph" />}
      <label className="pv-toggle plain">
        Include Statuses
        <input type="checkbox" checked={withStatus} onChange={(e) => setWithStatus(e.target.checked)} />
        <i />
      </label>
      {plotNumber ? (
        <label className="pv-toggle plain">
          Open at plot {plotNumber}
          <input type="checkbox" checked={withPlot} onChange={(e) => setWithPlot(e.target.checked)} />
          <i />
        </label>
      ) : null}
      <button className="pv-outline" onClick={shareLink}>Share Link</button>
      <a className="pv-outline" href={qr} download={`${slug}-qr.png`}>Share QR Code</a>
    </Shell>
  );
}

export function GalleryModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [big, setBig] = useState<string | null>(null);
  return (
    <Shell onClose={big ? () => setBig(null) : onClose} className="pv-gallery">
      {big ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pv-gallery-big" src={big} alt="" onClick={() => setBig(null)} />
      ) : (
        <div className="pv-gallery-grid">
          {images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" onClick={() => setBig(src)} />
          ))}
        </div>
      )}
    </Shell>
  );
}

export function BrochureModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Shell onClose={onClose} className="pv-brochure">
      <iframe src={url} title="Brochure" />
    </Shell>
  );
}
