export interface PriceUpdate {
	symbol: string;
	name?: string;
	price: number;
	change: number;
	change_percent: number;
	volume: number;
	timestamp?: string;
}

export interface SnapshotMessage {
	type: "snapshot";
	data: PriceUpdate[];
	timestamp: string;
}

export interface PriceMessage {
	type: "price";
	symbol: string;
	price: number;
	change: number;
	change_percent: number;
	volume: number;
	timestamp: string;
}

export interface SubscribeMessage {
	type: "subscribe";
	symbols: string[];
}

export type ServerMessage = SnapshotMessage | PriceMessage;
