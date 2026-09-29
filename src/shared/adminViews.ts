export type AdminView =
  | "dashboard"
  | "ventures"
  | "inventory"
  | "layouts"
  | "leads"
  | "bookingApplications"
  | "customers"
  | "visits"
  | "reports"
  | "documents"
  | "users"
  | "audit";

export const SIDEBAR_SECTIONS: {
  title: string | null;
  items: { view: AdminView; label: string }[];
}[] = [
  { title: null, items: [{ view: "dashboard", label: "Overview" }] },
  {
    title: "Portfolio",
    items: [
      { view: "ventures", label: "Ventures" },
      { view: "inventory", label: "Plot Inventory" },
      { view: "layouts", label: "Layouts & GIS" },
    ],
  },
  {
    title: "Sales",
    items: [
      { view: "leads", label: "Applications & Leads" },
      { view: "bookingApplications", label: "Booking Applications" },
      { view: "customers", label: "Customers" },
      { view: "visits", label: "Site Visits" },
    ],
  },
  {
    title: "Operations",
    items: [
      { view: "reports", label: "Reports" },
      { view: "documents", label: "Documents" },
      { view: "users", label: "Users & Roles" },
      { view: "audit", label: "Audit Log" },
    ],
  },
];

export const MOBILE_NAV: { view: AdminView; label: string }[] = [
  { view: "dashboard", label: "Overview" },
  { view: "ventures", label: "Ventures" },
  { view: "inventory", label: "Plots" },
  { view: "leads", label: "Leads" },
  { view: "bookingApplications", label: "Bookings" },
  { view: "visits", label: "Visits" },
];
