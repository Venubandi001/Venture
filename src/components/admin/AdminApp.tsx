"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/shared/users";
import { AdminView } from "@/shared/adminViews";
import { AdminMobileNav, AdminSideNav } from "./AdminSidebar";
import DashboardView from "./DashboardView";
import VentureManagerView from "./VentureManagerView";
import InventoryView from "./InventoryView";
import LeadsView from "./LeadsView";
import BookingApplicationsView from "./BookingApplicationsView";
import LayoutsView from "./LayoutsView";
import UsersView from "./UsersView";
import { AuditLogView, CustomersView, DocumentsView, ReportsView, SiteVisitsView } from "./OperationsViews";
import { ChangePasswordForm } from "./PasswordForms";
import { VenturesProvider, useVentures } from "./VenturesContext";
import { useToast } from "../ToastProvider";

const ADMIN_ONLY: AdminView[] = ["layouts", "users", "audit"];

export default function AdminApp({ user }: { user: User }) {
  return (
    <VenturesProvider>
      <AdminShell user={user} />
    </VenturesProvider>
  );
}

function AdminShell({ user }: { user: User }) {
  const router = useRouter();
  const showToast = useToast();
  const { ventures, loaded } = useVentures();
  const [view, setView] = useState<AdminView>("dashboard");
  const [picked, setPicked] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const hidden = user.role === "admin" ? [] : ADMIN_ONLY;
  // the venture every screen works on: last picked, else the first live one
  const slug = picked || ventures.find((v) => v.status === "live")?.slug || ventures[0]?.slug || "";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  function renderView() {
    if (!loaded) return <p className="le-muted">Loading…</p>;
    if (hidden.includes(view)) return <p className="le-muted">This section is for admins only.</p>;
    const common = { slug, onSelectVenture: setPicked };
    switch (view) {
      case "dashboard":
        return <DashboardView {...common} onOpen={(v, s) => { if (s) setPicked(s); setView(v); }} isAdmin={user.role === "admin"} />;
      case "ventures":
        return <VentureManagerView key={slug} {...common} isAdmin={user.role === "admin"} onOpenLayouts={() => setView("layouts")} />;
      case "inventory":
        return <InventoryView key={slug} {...common} />;
      case "layouts":
        return <LayoutsView key={slug} {...common} />;
      case "leads":
        return <LeadsView />;
      case "bookingApplications":
        return <BookingApplicationsView {...common} />;
      case "customers":
        return <CustomersView />;
      case "visits":
        return <SiteVisitsView />;
      case "reports":
        return <ReportsView />;
      case "documents":
        return <DocumentsView onOpenLayouts={(s) => { setPicked(s); setView("layouts"); }} isAdmin={user.role === "admin"} />;
      case "users":
        return <UsersView me={user} />;
      case "audit":
        return <AuditLogView />;
    }
  }

  return (
    <div className="admin">
      <header className="adminnav">
        <div className="brand">
          VENTURE<span>.</span> / CONTROL
        </div>
        <div className="admin-top-actions">
          <span className="admin-user">
            <span><b>{user.name}</b> <small>{user.role}</small></span>
          </span>
          <Link className="btn ghost" href="/">
            View Customer Site
          </Link>
          <button className="btn ghost" onClick={() => setPwOpen(true)}>Change password</button>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <AdminMobileNav active={view} onSelect={setView} hidden={hidden} />

      <div className="adminbody">
        <AdminSideNav active={view} onSelect={setView} hidden={hidden} />
        <main className="main">{renderView()}</main>
      </div>

      {pwOpen ? (
        <div className="booking-modal-bg" onClick={() => setPwOpen(false)}>
          <div className="booking-modal pw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-head">
              <div><h2>Change password</h2><p>You’ll stay signed in here; other devices are signed out.</p></div>
              <button className="booking-close" onClick={() => setPwOpen(false)}>×</button>
            </div>
            <ChangePasswordForm onDone={() => { setPwOpen(false); showToast("Password changed"); }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
