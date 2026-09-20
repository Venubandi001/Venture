"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminView, OTHER_VIEW_LABEL } from "@/lib/adminViews";
import { VENTURE_PROFILES } from "@/lib/ventures";
import { AdminMobileNav, AdminSideNav } from "./AdminSidebar";
import DashboardView from "./DashboardView";
import VentureManagerView from "./VentureManagerView";
import InventoryView from "./InventoryView";
import LeadsView from "./LeadsView";
import BookingApplicationsView from "./BookingApplicationsView";
import BookingsView from "./BookingsView";
import LayoutsView from "./LayoutsView";
import OtherView from "./OtherView";

export default function AdminApp() {
  const [view, setView] = useState<AdminView>("dashboard");
  const [activeVenture, setActiveVenture] = useState("Haritha Vanam");

  const activeProfile = VENTURE_PROFILES[activeVenture];

  function openVentureDetails(name: string) {
    setActiveVenture(name);
    setView("ventures");
  }

  function renderView() {
    switch (view) {
      case "dashboard":
        return (
          <DashboardView profile={activeProfile} onOpenVenture={openVentureDetails} />
        );
      case "ventures":
        return (
          <VentureManagerView
            activeKey={activeVenture}
            onSelectVenture={setActiveVenture}
          />
        );
      case "inventory":
        return <InventoryView ventureBrand={activeProfile.brand} />;
      case "leads":
        return <LeadsView />;
      case "bookingApplications":
        return <BookingApplicationsView />;
      case "bookings":
        return <BookingsView />;
      case "layouts":
        return <LayoutsView />;
      default:
        return <OtherView title={OTHER_VIEW_LABEL[view] ?? "Operations"} />;
    }
  }

  return (
    <div className="admin">
      <header className="adminnav">
        <div className="brand">
          VENTURE<span>.</span> / CONTROL
        </div>
        <div className="admin-top-actions">
          <span className="admin-live">
            <i /> LIVE OPERATIONS
          </span>
          <Link className="btn ghost" href="/">
            View Customer Site
          </Link>
        </div>
      </header>

      <AdminMobileNav active={view} onSelect={setView} />

      <div className="adminbody">
        <AdminSideNav active={view} onSelect={setView} />
        <main className="main">{renderView()}</main>
      </div>
    </div>
  );
}
