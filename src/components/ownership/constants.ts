import type { InvestorType } from "./types";

export const INVESTOR_TYPE_COLORS: Record<InvestorType, string> = {
	CP: "#1d5fc9",
	ID: "#17a568",
	IB: "#ff8a2a",
	MF: "#7a4bc8",
	SC: "#d2344a",
	OT: "#55598a",
	IS: "#0891b2",
	PF: "#ea580c",
	FD: "#6d28d9",
	"": "#8b8fb0",
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
