// Rotating ticker list for automated weekly research content.
// Picks deterministically by day-of-year / week-of-year so subsequent cron
// ticks generate distinct tickers without needing state.
//
// Lives on Worker-side (not DB) — intentional. Changing the list means a
// deploy, which is exactly what we want: list edits are product decisions.

import { generateDeepDive } from "./deep-dive";
import { generateEarningsPreview } from "./earnings-preview";

// Top ~30 IDX names by liquidity + sector coverage. First-pass curation.
// Intentionally banks-weighted (they dominate flow + are what subs want).
export const ROTATION_TICKERS: readonly string[] = [
	// Banks
	"BBCA", "BBRI", "BMRI", "BBNI", "BRIS",
	// Telco
	"TLKM", "EXCL", "ISAT",
	// Consumer staples / goods
	"ICBP", "INDF", "MYOR", "UNVR", "KLBF",
	// Energy / coal
	"MEDC", "ADRO", "PTBA", "ITMG",
	// Materials / metals
	"ANTM", "INCO", "TINS", "MDKA",
	// Infrastructure / construction
	"JSMR", "WIKA", "WSKT", "PGAS",
	// Property
	"BSDE", "SMRA", "PWON", "CTRA",
	// Tech / internet
	"GOTO", "BUKA",
	// Auto / industrial
	"ASII", "UNTR",
	// Healthcare
	"SIDO", "KAEF",
] as const;

// UTC-day based index so two calls on the same UTC day pick the same ticker.
function dayOfYearUTC(d: Date): number {
	const start = Date.UTC(d.getUTCFullYear(), 0, 0);
	return Math.floor((d.getTime() - start) / 86_400_000);
}

function pickTicker(n: number, seed: number): string {
	return ROTATION_TICKERS[seed % ROTATION_TICKERS.length];
}

// Called by the daily-weekday cron. Picks one ticker by day-of-year, writes
// draft. Skips if a deep-dive for that ticker+month already exists (slug
// collision — upsert would silently overwrite, so we check first).
export async function generateRotatingDeepDive(env: Parameters<typeof generateDeepDive>[0]) {
	const now = new Date();
	const seed = dayOfYearUTC(now);
	const ticker = pickTicker(ROTATION_TICKERS.length, seed);
	return generateDeepDive(env, ticker);
}

// Weekly earnings previews — generates previews for the next N tickers in
// rotation. Intended to run once a week ahead of the earnings cycle.
export async function generateWeeklyEarningsPreviews(
	env: Parameters<typeof generateEarningsPreview>[0],
	count: number = 3,
): Promise<Array<{ ticker: string; ok: boolean; slug?: string; error?: string }>> {
	const now = new Date();
	const seed = dayOfYearUTC(now);
	const results: Array<{ ticker: string; ok: boolean; slug?: string; error?: string }> = [];
	for (let i = 0; i < count; i++) {
		const ticker = pickTicker(ROTATION_TICKERS.length, seed + i);
		try {
			const r = await generateEarningsPreview(env, ticker);
			results.push({ ticker, ...r });
		} catch (e) {
			results.push({
				ticker,
				ok: false,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	}
	return results;
}
