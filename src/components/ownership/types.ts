export type InvestorType = "CP" | "ID" | "IB" | "MF" | "SC" | "OT" | "IS" | "PF" | "FD" | "";

export interface HeatmapCell {
  investor: string;
  company: string;
  companyCode: string;
  percentage: number;
}

export interface HeatmapData {
  investors: string[];
  companies: { code: string; name: string }[];
  cells: HeatmapCell[];
}

export interface ChordData {
  keys: InvestorType[];
  names: string[];
  colors: string[];
  matrix: number[][];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "investor" | "company";
  investorType?: InvestorType;
  localForeign?: "L" | "A" | "";
  size: number;
}

export interface GraphLink {
  source: string;
  target: string;
  percentage: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  availableTypeCounts?: Partial<Record<InvestorType, number>>;
  availableLFCounts?: Partial<Record<string, number>>;
}

export interface SankeyNode {
  id: string;
  label: string;
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface TreemapNode {
  name: string;
  value: number;
  type?: InvestorType;
  children?: TreemapNode[];
}

export interface BubbleNode {
  id: string;
  name: string;
  cluster: number;
  size: number;
  totalInsiderPct?: number;
  sharedInvestors?: number;
  memberCount?: number;
  totalClusterInvestors?: number;
  avgClusterPct?: number;
  children?: BubbleNode[];
}

export interface TypeDistributionItem {
  type: InvestorType;
  label: string;
  color: string;
  count: number;
  totalPct: number;
  avgPct: number;
}

export interface LocalForeignSplit {
  local: { count: number; totalPct: number };
  foreign: { count: number; totalPct: number };
}

export interface ConcentrationBucket {
  bucket: string;
  count: number;
  companies?: string[];
}

export interface DashboardStats {
  totalRecords: number;
  totalCompanies: number;
  totalInvestors: number;
  multiCompanyInvestors: number;
  avgInsidersPerCompany: number;
  topConnectors: { name: string; count: number; type: InvestorType }[];
}
