import { useEffect } from "react";
import { MarketWS } from "../lib/ws";
import { useRealtimeStore } from "../stores/realtime-store";

let sharedWS: MarketWS | null = null;
let refCount = 0;

function acquireWS() {
	if (!sharedWS) {
		sharedWS = new MarketWS({
			onSnapshot: (data) => useRealtimeStore.getState().setSnapshot(data),
			onPrice: (update) => useRealtimeStore.getState().updatePrice(update),
			onStatusChange: (status) => useRealtimeStore.getState().setStatus(status),
		});
		sharedWS.connect();
	}
	refCount++;
	return sharedWS;
}

function releaseWS() {
	refCount--;
	if (refCount <= 0 && sharedWS) {
		sharedWS.disconnect();
		sharedWS = null;
		refCount = 0;
	}
}

/** Initializes the global WS connection. Call once in AppShell. */
export function useRealtime() {
	useEffect(() => {
		acquireWS();
		return () => releaseWS();
	}, []);
}

/** Subscribe to realtime updates for specific symbols. */
export function useRealtimeSubscription(symbols: string[]) {
	useEffect(() => {
		if (!sharedWS || symbols.length === 0) return;

		sharedWS.subscribe(symbols);

		return () => {
			sharedWS?.unsubscribe(symbols);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- symbols array is memoized by caller
	}, [symbols]);
}
