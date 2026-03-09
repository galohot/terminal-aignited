const RECENT_KEY = "terminal:recent-searches";
const MAX_RECENT = 10;

export function addRecentSearch(symbol: string) {
	const recent = getRecentSearches();
	const updated = [symbol, ...recent.filter((s) => s !== symbol)].slice(0, MAX_RECENT);
	localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export function getRecentSearches(): string[] {
	try {
		return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
	} catch {
		return [];
	}
}
