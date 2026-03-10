const SESSION_KEY = "terminal:sid";

function getSessionId(): string {
	let sid = sessionStorage.getItem(SESSION_KEY);
	if (!sid) {
		sid = crypto.randomUUID();
		sessionStorage.setItem(SESSION_KEY, sid);
	}
	return sid;
}

export function trackPageView(path: string) {
	const body = {
		session_id: getSessionId(),
		path,
		referrer: document.referrer || undefined,
	};

	// Fire-and-forget — don't block UI
	fetch("/api/analytics/event", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	}).catch(() => {
		// Silent fail — analytics should never break the app
	});
}

export interface SiteStats {
	online: number;
	total_visitors: number;
	total_views: number;
}

export async function fetchStats(): Promise<SiteStats> {
	const res = await fetch("/api/analytics/stats");
	if (!res.ok) throw new Error("Failed to fetch stats");
	return res.json() as Promise<SiteStats>;
}
