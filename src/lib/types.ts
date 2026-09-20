export type PlotStatus = "available" | "hold" | "reserved" | "sold";

export interface Plot {
  id: number;
  area: number;
  facing: string;
  road: number;
  dims: string;
  price: number;
  status: PlotStatus;
}

export interface DimensionRow {
  area: string;
  dims: string;
  price: string;
  road: string;
  facing: string;
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
  hold: "On Hold",
  reserved: "Reserved / Under Construction",
  sold: "Sold Out",
};

export const STATUS_TAG: Record<PlotStatus, string> = {
  available: "OPEN",
  hold: "HOLD",
  reserved: "RESERVED",
  sold: "SOLD",
};

export const STATUS_COLOR: Record<PlotStatus, string> = {
  available: "#176b2c",
  hold: "#f0a51a",
  reserved: "#7b4fa0",
  sold: "#9b0000",
};
