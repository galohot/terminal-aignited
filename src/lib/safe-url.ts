const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeUrl(raw: string | null | undefined): string {
	if (!raw) return "#";
	try {
		const base = typeof window !== "undefined" ? window.location.origin : "https://terminal.aignited.id";
		const u = new URL(raw, base);
		return SAFE_PROTOCOLS.has(u.protocol) ? u.toString() : "#";
	} catch {
		return "#";
	}
}
