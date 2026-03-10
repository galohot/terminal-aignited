import type { PriceUpdate, ServerMessage } from "../types/ws";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 3_000;
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 10_000;

export class MarketWS {
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = INITIAL_RECONNECT_DELAY;
	private subscribedSymbols = new Set<string>();
	private pendingSubscriptions: string[] = [];
	private disposed = false;

	private onSnapshot: (data: PriceUpdate[]) => void;
	private onPrice: (update: PriceUpdate) => void;
	private onStatusChange: (status: ConnectionStatus) => void;

	constructor(opts: {
		onSnapshot: (data: PriceUpdate[]) => void;
		onPrice: (update: PriceUpdate) => void;
		onStatusChange: (status: ConnectionStatus) => void;
	}) {
		this.onSnapshot = opts.onSnapshot;
		this.onPrice = opts.onPrice;
		this.onStatusChange = opts.onStatusChange;
	}

	async connect() {
		if (this.disposed) return;
		this.onStatusChange("connecting");

		try {
			const res = await fetch("/api/proxy/ws-ticket", { method: "POST" });
			if (!res.ok) {
				if (res.status === 429) {
					// Rate limited — use longer backoff
					this.reconnectDelay = Math.max(this.reconnectDelay, 15_000);
				}
				throw new Error(`Failed to get WS ticket (${res.status})`);
			}
			const { ticket } = (await res.json()) as { ticket: string };

			const wsUrl = `wss://terminal.thedailycatalyst.site/ws?ticket=${ticket}`;
			this.ws = new WebSocket(wsUrl);
		} catch {
			this.onStatusChange("disconnected");
			this.scheduleReconnect();
			return;
		}

		this.ws.onopen = () => {
			this.onStatusChange("connected");
			this.reconnectDelay = INITIAL_RECONNECT_DELAY;
			this.startHeartbeat();
			this.flushPendingSubscriptions();
		};

		this.ws.onmessage = (event: MessageEvent) => {
			this.resetHeartbeatTimeout();
			try {
				const msg = JSON.parse(event.data as string) as ServerMessage;
				if (msg.type === "snapshot") {
					this.onSnapshot(msg.data);
				} else if (msg.type === "price") {
					this.onPrice(msg);
				} else if ((msg as { type: string }).type === "pong") {
					// heartbeat response — handled by resetHeartbeatTimeout above
				}
			} catch {
				// malformed message — ignore
			}
		};

		this.ws.onclose = (event: CloseEvent) => {
			this.stopHeartbeat();
			this.onStatusChange("disconnected");
			if (event.code === 4001 || this.disposed) return;
			this.scheduleReconnect();
		};

		this.ws.onerror = () => {
			this.onStatusChange("disconnected");
		};
	}

	subscribe(symbols: string[]) {
		const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
		if (newSymbols.length === 0) return;

		for (const s of newSymbols) this.subscribedSymbols.add(s);

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: "subscribe", symbols: newSymbols }));
		} else {
			this.pendingSubscriptions.push(...newSymbols);
		}
	}

	unsubscribe(symbols: string[]) {
		for (const s of symbols) {
			this.subscribedSymbols.delete(s);
			this.pendingSubscriptions = this.pendingSubscriptions.filter((p) => p !== s);
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: "unsubscribe", symbols }));
		}
	}

	disconnect() {
		this.disposed = true;
		this.stopHeartbeat();
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.ws?.close();
		this.ws = null;
	}

	private flushPendingSubscriptions() {
		if (this.pendingSubscriptions.length === 0 && this.subscribedSymbols.size === 0) return;

		// On reconnect, resubscribe to all tracked symbols
		const all = [...this.subscribedSymbols];
		if (all.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: "subscribe", symbols: all }));
		}
		this.pendingSubscriptions = [];
	}

	private scheduleReconnect() {
		if (this.disposed) return;
		this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
	}

	private startHeartbeat() {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: "ping" }));
				this.heartbeatTimeout = setTimeout(() => {
					// No pong received — force reconnect
					this.ws?.close();
				}, HEARTBEAT_TIMEOUT);
			}
		}, HEARTBEAT_INTERVAL);
	}

	private stopHeartbeat() {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
		this.heartbeatTimer = null;
		this.heartbeatTimeout = null;
	}

	private resetHeartbeatTimeout() {
		if (this.heartbeatTimeout) {
			clearTimeout(this.heartbeatTimeout);
			this.heartbeatTimeout = null;
		}
	}
}
