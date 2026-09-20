import { DimensionRow, VentureProfile } from "./types";

export const VENTURE_PROFILES: Record<string, VentureProfile> = {
  "Haritha Vanam": {
    key: "Haritha Vanam",
    brand: "Haritha Vanam",
    tag: "Nature · Land · Living",
    logo: "HV",
    loc: "Hyderabad, Telangana",
    locality: "Near Outer Ring Road",
    address:
      "Survey No. 124, Haritha Vanam Road, Hyderabad, Telangana – 500001",
    acres: "18.42",
    plots: 240,
    available: 126,
    hold: 11,
    under: 18,
    sold: 85,
    center: [17.462222, 78.154444],
    span: [0.00495, 0.0064],
    status: "LIVE",
  },
  "Green Valley": {
    key: "Green Valley",
    brand: "Green Valley",
    tag: "Green · Valley · Living",
    logo: "GV",
    loc: "Hyderabad, Telangana",
    locality: "Near Outer Ring Road",
    address: "Survey No. 124, Green Valley Road, Hyderabad, Telangana – 500001",
    acres: "18.42",
    plots: 240,
    available: 126,
    hold: 11,
    under: 18,
    sold: 85,
    center: [17.462222, 78.154444],
    span: [0.00495, 0.0064],
    status: "LIVE",
  },
  "Lakeview Enclave": {
    key: "Lakeview Enclave",
    brand: "Lakeview Enclave",
    tag: "Lake · View · Living",
    logo: "LE",
    loc: "Shamshabad, Telangana",
    locality: "Near Airport Road",
    address: "Survey No. 87, Lakeview Road, Shamshabad, Telangana – 501218",
    acres: "24.8",
    plots: 318,
    available: 204,
    hold: 13,
    under: 40,
    sold: 61,
    center: [17.2405, 78.4298],
    span: [0.0052, 0.0068],
    status: "LIVE",
  },
  "Oak County": {
    key: "Oak County",
    brand: "Oak County",
    tag: "Open · Green · Living",
    logo: "OC",
    loc: "Yadadri, Telangana",
    locality: "Near Temple Road",
    address: "Survey No. 42, Oak County Road, Yadadri, Telangana – 508115",
    acres: "31.2",
    plots: 412,
    available: 330,
    hold: 12,
    under: 31,
    sold: 39,
    center: [17.5927, 78.9452],
    span: [0.006, 0.008],
    status: "LIVE",
  },
};

export const DEFAULT_DIMENSIONS: DimensionRow[] = [
  { area: "150", dims: "30 × 45", price: "₹32L", road: "30", facing: "East" },
  { area: "180", dims: "36 × 45", price: "₹36L", road: "30", facing: "East" },
  { area: "200", dims: "40 × 50", price: "₹40L", road: "40", facing: "East" },
  { area: "220", dims: "44 × 45", price: "₹44L", road: "40", facing: "East" },
  { area: "250", dims: "45 × 50", price: "₹49L", road: "60", facing: "East" },
];

export interface InventoryRow {
  plot: string;
  venture: string;
  area: number;
  facing: string;
  road: number;
  price: number;
  status: "available" | "sold" | "reserved" | "hold";
  updatedMinutes: number;
}

export function buildInventory(ventureBrand: string): InventoryRow[] {
  const ids = [
    "101", "102", "103", "104", "105", "106",
    "107", "108", "109", "110", "111", "112",
  ];
  const statuses: InventoryRow["status"][] = [
    "available", "available", "available", "available", "sold", "available",
    "available", "reserved", "available", "sold", "available", "hold",
  ];
  const areas = [150, 180, 200, 220, 250];
  const faces = ["East", "North", "West", "South"];
  const roads = [30, 30, 40, 40, 60];
  const prices = [32, 36, 40, 44, 49];
  const minutes = [2, 8, 14, 22, 31];

  return ids.map((plot, i) => ({
    plot: `P-${plot}`,
    venture: ventureBrand,
    area: areas[i % 5],
    facing: faces[i % 4],
    road: roads[i % 5],
    price: prices[i % 5],
    status: statuses[i],
    updatedMinutes: minutes[i % 5],
  }));
}
