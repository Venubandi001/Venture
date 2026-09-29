// Order matters: it's the column/legend order everywhere.
export const PLOT_STATUSES = ["available", "confirmed", "received", "hold", "sold", "mortgage"] as const;
export type PlotStatus = (typeof PLOT_STATUSES)[number];

export interface Plot {
  id: number;
  area: number;
  facing: string;
  road: number;
  dims: string;
  price: number;
  status: PlotStatus;
}

export interface VentureProfile {
  key: string;
  brand: string;
  tag: string;
  logo: string;
  loc: string;
  locality: string;
  address: string;
  acres: string;
  plots: number;
  available: number;
  hold: number;
  under: number;
  sold: number;
  center: [number, number];
  span: [number, number];
  status: string;
}

export const STATUS_LABEL: Record<PlotStatus, string> = {
  available: "Available",
  confirmed: "Booking Confirmed",
  received: "Received",
  hold: "Hold",
  sold: "Sold Out",
  mortgage: "Mortgage",
};

export const STATUS_TAG: Record<PlotStatus, string> = {
  available: "OPEN",
  confirmed: "BOOKED",
  received: "RECEIVED",
  hold: "HOLD",
  sold: "SOLD",
  mortgage: "MORTGAGE",
};

export const STATUS_COLOR: Record<PlotStatus, string> = {
  available: "#176b2c",
  confirmed: "#7b4fa0",
  received: "#128a8a",
  hold: "#f0a51a",
  sold: "#9b0000",
  mortgage: "#8a5a2b",
};

/** Statuses a buyer can no longer book (drives the "Plot X was just booked" alert). */
export const TAKEN: PlotStatus[] = ["confirmed", "received", "sold"];

export const FACINGS = [
  "East", "West", "North", "South",
  "North-East", "North-West", "South-East", "South-West",
];
