// Daily per-user Telegram DM digest of new research articles.
// Complements broadcastToTelegram (single shared channel) — this is 1:many DMs
// filtered by each user's type preferences and tier.

import { tierMeets } from "./lib/tier";
import type { Article } from "./research";
import { listArticlesFull } from "./research";
import {
	hasDelivered,
	listTelegramSubscribers,
	recordDelivery,
	type TelegramSubscriber,
} from "./telegram-link";

export interface DigestEnv {
	AUTH_DATABASE_URL: string;
	TELEGRAM_NEWSLETTER_BOT_TOKEN?: string;
}

const SITE_ORIGIN = "https://terminal.aignited.id";
const MAX_ARTICLES_PER_DM = 5;

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function typeLabel(type: string): string {
	if (type === "am_brief") return "AM Brief";
	if (type === "deep_dive") return "Deep Dive";
	if (type === "earnings_preview") return "Earnings Preview";
	if (type === "sector") return "Sector Monthly";
	if (type === "power_map") return "Power Map";
	if (type === "macro") return "Macro";
	return "Research";
}

function formatDigest(articles: Article[]): string {
	const header = `<b>AIgnited Research — Daily Digest</b>\n<i>${articles.length} new article${articles.length === 1 ? "" : "s"}</i>`;
	const blocks = articles.map((a) => {
		const url = `${SITE_ORIGIN}/research/${a.slug}`;
		const tickers = a.tickers.slice(0, 4).join(" · ");
		return [
			`<b><a href="${url}">${escapeHtml(a.title)}</a></b>`,
			`<code>${escapeHtml(typeLabel(a.type))}</code>${tickers ? ` · ${escapeHtml(tickers)}` : ""}`,
			escapeHtml(a.summary.slice(0, 280)),
		].join("\n");
	});
	return [header, ...blocks].join("\n\n");
}

async function sendTelegramDm(
	token: string,
	chatId: string,
	text: string,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: "HTML",
				disable_web_page_preview: true,
			}),
		});
		if (!res.ok) {
			const txt = await res.text();
			return { ok: false, error: `telegram ${res.status}: ${txt.slice(0, 200)}` };
		}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

async function filterUndelivered(
	dbUrl: string,
	userId: string,
	articles: Article[],
): Promise<Article[]> {
	const out: Article[] = [];
	for (const a of articles) {
		if (!(await hasDelivered(dbUrl, userId, a.id))) out.push(a);
	}
	return out;
}

function pickForSubscriber(subscriber: TelegramSubscriber, pool: Article[]): Article[] {
	const typeFilter = new Set(subscriber.types);
	return pool.filter((a) => typeFilter.has(a.type) && tierMeets(subscriber.tier, a.required_tier));
}

export async function runTelegramDigest(
	env: DigestEnv,
): Promise<{ users: number; delivered: number; skipped: number; errors: string[] }> {
	if (!env.TELEGRAM_NEWSLETTER_BOT_TOKEN) {
		return { users: 0, delivered: 0, skipped: 0, errors: ["bot token missing"] };
	}

	const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString(); // 26h buffer for cron skew
	const pool = await listArticlesFull(env.AUTH_DATABASE_URL, { since, limit: 50 });
	if (pool.length === 0) {
		return { users: 0, delivered: 0, skipped: 0, errors: [] };
	}

	const subscribers = await listTelegramSubscribers(env.AUTH_DATABASE_URL);
	const errors: string[] = [];
	let delivered = 0;
	let skipped = 0;

	for (const sub of subscribers) {
		const eligible = pickForSubscriber(sub, pool);
		if (eligible.length === 0) {
			skipped++;
			continue;
		}
		const fresh = await filterUndelivered(env.AUTH_DATABASE_URL, sub.userId, eligible);
		if (fresh.length === 0) {
			skipped++;
			continue;
		}
		const slice = fresh.slice(0, MAX_ARTICLES_PER_DM);
		const text = formatDigest(slice);
		const result = await sendTelegramDm(env.TELEGRAM_NEWSLETTER_BOT_TOKEN, sub.chatId, text);
		if (!result.ok) {
			errors.push(`user=${sub.userId}: ${result.error ?? "unknown"}`);
			continue;
		}
		for (const a of slice) {
			await recordDelivery(env.AUTH_DATABASE_URL, sub.userId, a.id);
		}
		delivered++;
	}

	return { users: subscribers.length, delivered, skipped, errors };
}
