import { useEffect, useRef } from "react";
import { MarketWS } from "../lib/ws";
import { useRealtimeStore } from "../stores/realtime-store";

export function useRealtime() {
	const setStatus = useRealtimeStore((s) => s.setStatus);
	const setSnapshot = useRealtimeStore((s) => s.setSnapshot);
	const updatePrice = useRealtimeStore((s) => s.updatePrice);
	const wsRef = useRef<MarketWS | null>(null);

	useEffect(() => {
		const ws = new MarketWS({
			onSnapshot: setSnapshot,
			onPrice: updatePrice,
			onStatusChange: setStatus,
		});
		wsRef.current = ws;
		ws.connect();

		return () => {
			ws.disconnect();
			wsRef.current = null;
		};
	}, [setStatus, setSnapshot, updatePrice]);
}
