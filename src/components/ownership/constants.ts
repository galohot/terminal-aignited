import type { InvestorType } from "./types";

export const INVESTOR_TYPE_COLORS: Record<InvestorType, string> = {
  CP: "#6ea8ff",
  ID: "#3ddc91",
  IB: "#ffbf47",
  MF: "#8b7bff",
  SC: "#ff6b6b",
  OT: "#72857e",
  IS: "#14b8a6",
  PF: "#f97316",
  FD: "#a78bfa",
  "": "#4a5e58",
};

export const INVESTOR_TYPE_LABELS: Record<InvestorType, string> = {
  CP: "Corporate",
  ID: "Individual",
  IB: "Investment Bank",
  MF: "Mutual Fund",
  SC: "Securities Co.",
  OT: "Other",
  IS: "Insurance",
  PF: "Pension Fund",
  FD: "Foundation",
  "": "Unknown",
};

export const LOCAL_FOREIGN_LABELS: Record<string, string> = {
  L: "Local",
  A: "Foreign",
  "": "Unknown",
};
