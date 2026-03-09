export interface WebSocketTradeMessage {
	type: "trade";
	data: {
		symbol: string;
		price: number;
		volume: number;
		timestamp: number;
	}[];
}

export interface WebSocketStatusMessage {
	type: "status";
	message: string;
}

export type WebSocketMessage = WebSocketTradeMessage | WebSocketStatusMessage;
