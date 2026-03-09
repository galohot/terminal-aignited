import type { PriceUpdate, ServerMessage } from "../types/ws";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export class MarketWS {
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
		this.onStatusChange("connecting");

		try {
			// Step 1: Get ticket via CF proxy
			const res = await fetch("/api/proxy/ws-ticket", { method: "POST" });
			if (!res.ok) throw new Error("Failed to get WS ticket");
			const { ticket } = (await res.json()) as { ticket: string };

			// Step 2: Open WebSocket with ticket
			const wsUrl = `wss://terminal.thedailycatalyst.site/ws?ticket=${ticket}`;
			this.ws = new WebSocket(wsUrl);
		} catch {
			this.onStatusChange("disconnected");
			this.reconnectTimer = setTimeout(() => this.connect(), 5000);
			return;
		}

		this.ws.onopen = () => {
			this.onStatusChange("connected");
		};

		this.ws.onmessage = (event: MessageEvent) => {
			const msg = JSON.parse(event.data as string) as ServerMessage;
			if (msg.type === "snapshot") {
				this.onSnapshot(msg.data);
			} else if (msg.type === "price") {
				this.onPrice(msg);
			}
		};

		this.ws.onclose = (event: CloseEvent) => {
			this.onStatusChange("disconnected");
			if (event.code === 4001) return;
			this.reconnectTimer = setTimeout(() => this.connect(), 3000);
		};

		this.ws.onerror = () => {
			this.onStatusChange("disconnected");
		};
	}

	subscribe(symbols: string[]) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: "subscribe", symbols }));
		}
	}

	disconnect() {
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.ws?.close();
		this.ws = null;
	}
}
