// Shapes mirror market-api/src/paper/model.rs exactly.

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "open" | "filled" | "partial" | "cancelled" | "rejected";

export interface PaperOrder {
	id: number;
	ticker: string;
	side: OrderSide;
	order_type: OrderType;
	qty_lots: number;
	limit_price_idr: number | null;
	status: OrderStatus;
	filled_qty_lots: number;
	avg_fill_price_idr: number | null;
	placed_at: string;
	filled_at: string | null;
}

export interface PaperAccount {
	user_id: string;
	cash_idr: number;
	starting_cash_idr: number;
	created_at: string;
}

export interface PaperPosition {
	ticker: string;
	qty_lots: number;
	qty_shares: number;
	avg_cost_idr: number;
	current_price_idr: number;
	market_value_idr: number;
	unrealized_pnl_idr: number;
	unrealized_pnl_pct: number;
	realized_pnl_idr: number;
	price_stale: boolean;
}

export interface PaperPortfolio {
	user_id: string;
	cash_idr: number;
	positions: PaperPosition[];
	total_equity_idr: number;
	total_realized_pnl_idr: number;
	total_unrealized_pnl_idr: number;
	starting_cash_idr: number;
	return_pct: number;
}

export interface PaperFill {
	id: number;
	order_id: number;
	ticker: string;
	side: OrderSide;
	qty_lots: number;
	price_idr: number;
	fee_idr: number;
	filled_at: string;
}

export interface PaperPnl {
	range: string;
	points: Array<{ t: string; equity_idr: number }>;
	realized_pnl_idr: number;
	unrealized_pnl_idr: number;
	total_return_pct: number;
}

export interface PlaceOrderRequest {
	ticker: string;
	side: OrderSide;
	order_type: OrderType;
	qty_lots: number;
	limit_price_idr?: number;
}
