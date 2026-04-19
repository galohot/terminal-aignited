// Daily AM Brief generator — runs at 23:30 UTC (06:30 WIB) via scheduled handler.
// Pulls breadth + movers + sector perf + news from market-api, prompts LLM,
// stores result as a draft research article. A second cron at 23:40 UTC
// auto-publishes any AM brief still in draft (per plan: 10-min grace).

import { callLLM, type LLMEnv } from "./llm";
import { broadcastToTelegram, fanoutEmails, type NotificationsEnv } from "./notifications";
import {
	getArticleBySlug,
	listDrafts,
	listEmailSubscribersForType,
	publishArticle,
	upsertArticle,
} from "./research";
import type { Tool } from "./tools";

interface BriefEnv extends LLMEnv, NotificationsEnv {
	API_BASE_URL: string;
	API_KEY: string;
	TERMINAL_API_KEY?: string;
	AUTH_DATABASE_URL: string;
	WORKER_AUTH_SECRET?: string;
}

async function fetchMarketApi<T>(env: BriefEnv, path: string): Promise<T | null> {
	const url = new URL(`/api/v1/${path}`, env.API_BASE_URL);
	const headers: Record<string, string> = {
		"X-API-Key": env.TERMINAL_API_KEY || env.API_KEY,
	};
	if (env.WORKER_AUTH_SECRET) headers["X-Worker-Auth"] = env.WORKER_AUTH_SECRET;
	const res = await fetch(url.toString(), { headers });
	if (!res.ok) return null;
	return (await res.json()) as T;
}

interface SourceData {
	breadth: unknown;
	movers: unknown;
	sectors: unknown;
	news: unknown;
}

async function gatherSources(env: BriefEnv): Promise<SourceData> {
	const [breadth, movers, sectors, news] = await Promise.all([
		fetchMarketApi(env, "idx/market-breadth"),
		fetchMarketApi(env, "idx/top-movers?limit=10"),
		fetchMarketApi(env, "idx/sectors/performance"),
		fetchMarketApi(env, "news?limit=8"),
	]);
	return { breadth, movers, sectors, news };
}

const SYSTEM_PROMPT = `You are AIgnited Research, writing the daily AM Brief for the Indonesian equity market (IDX).

Style: tight, factual, hedged where appropriate. Lead with positive indicators when present, then risks. No filler, no clichés ("market participants will be watching"), no generic disclaimers. Use short paragraphs and concrete numbers from the source data.

Length: 800-1200 words. 4-6 sections. Use markdown headings (##) and tight paragraphs. DO NOT include code blocks (triple backticks) anywhere in body_md — this is a financial brief, not technical content.

Required sections:
1. **The Setup** — overnight context, what to watch open
2. **Breadth & Flow** — yesterday's tape from the data
3. **Movers** — top gainers/losers worth flagging
4. **Sectors** — what worked / didn't
5. **The Day Ahead** — 2-3 things to watch

You MUST call the submit_brief tool exactly once with the complete brief. Do not respond with text — only the tool call.

Tickers MUST be 4-letter IDX codes you actually mentioned in the body (no .JK suffix). Tags are lowercase, snake_case.`;

interface ParsedBrief {
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	tags: string[];
}

const SUBMIT_BRIEF_TOOL: Tool = {
	name: "submit_brief",
	description: "Submit the completed AM Brief. Call exactly once with all fields populated.",
	input_schema: {
		type: "object",
		properties: {
			title: { type: "string", description: "Headline, e.g. 'IDX Morning Brief — Apr 19, 2026'" },
			summary: { type: "string", description: "1-2 sentence dek for paywall preview" },
			body_md: {
				type: "string",
				description: "Full markdown body, 800-1200 words, with ## section headings. No code blocks.",
			},
			tickers: {
				type: "array",
				items: { type: "string" },
				description: "4-letter IDX codes mentioned in body, e.g. ['BBCA','BBRI']",
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description: "Lowercase snake_case tags, e.g. ['am_brief','ihsg']",
			},
		},
		required: ["title", "summary", "body_md", "tickers", "tags"],
	},
	dispatch: async () => ({ ok: true, data: null }),
};

function extractBriefFromToolUse(content: Array<{ type: string; [k: string]: unknown }>): ParsedBrief | null {
	const tu = content.find((b) => b.type === "tool_use" && b.name === "submit_brief");
	if (!tu) return null;
	const input = tu.input as Partial<ParsedBrief>;
	if (
		typeof input.title === "string" &&
		typeof input.summary === "string" &&
		typeof input.body_md === "string" &&
		Array.isArray(input.tickers) &&
		Array.isArray(input.tags)
	) {
		return input as ParsedBrief;
	}
	return null;
}

function todaySlugWIB(now: Date = new Date()): string {
	// WIB = UTC+7. Convert UTC to WIB date.
	const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	const y = wib.getUTCFullYear();
	const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
	const d = String(wib.getUTCDate()).padStart(2, "0");
	return `am-brief-${y}-${m}-${d}`;
}

export async function generateAmBrief(env: BriefEnv): Promise<{ ok: boolean; slug?: string; error?: string }> {
	const slug = todaySlugWIB();

	let sources: SourceData;
	try {
		sources = await gatherSources(env);
	} catch (e) {
		return { ok: false, error: `source_fetch: ${e instanceof Error ? e.message : String(e)}` };
	}

	const userMessage = `Today's source data (JSON):\n\n${JSON.stringify(sources, null, 2)}\n\nGenerate the AM Brief now by calling submit_brief.`;

	let llm;
	try {
		llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
			tools: [SUBMIT_BRIEF_TOOL],
			maxTokens: 8000,
			temperature: 0.4,
		});
	} catch (e) {
		return { ok: false, error: `llm: ${e instanceof Error ? e.message : String(e)}` };
	}

	const brief = extractBriefFromToolUse(llm.content as Array<{ type: string; [k: string]: unknown }>);
	if (!brief) {
		return { ok: false, error: "llm did not call submit_brief tool with valid arguments" };
	}

	try {
		await upsertArticle(env.AUTH_DATABASE_URL, {
			slug,
			type: "am_brief",
			title: brief.title,
			summary: brief.summary,
			body_md: brief.body_md,
			tickers: brief.tickers.map((t) => t.toUpperCase().replace(/\.JK$/i, "")),
			sectors: [],
			tags: brief.tags.map((t) => t.toLowerCase()),
			required_tier: "pro",
			status: "draft",
			generated_by: llm.provider,
		});
	} catch (e) {
		return { ok: false, error: `upsert: ${e instanceof Error ? e.message : String(e)}` };
	}

	return { ok: true, slug };
}

// Auto-publish drafts older than 9 minutes (10-min grace per plan).
// On publish, fan out to email subscribers + Telegram channel.
export async function autoPublishStaleAmBriefs(
	env: BriefEnv,
): Promise<{ published: number; emailed: number; telegram: boolean }> {
	const drafts = await listDrafts(env.AUTH_DATABASE_URL);
	const now = Date.now();
	let published = 0;
	let emailed = 0;
	let telegram = false;
	for (const a of drafts) {
		if (a.type !== "am_brief") continue;
		if (a.status !== "draft") continue;
		const age = now - new Date(a.created_at).getTime();
		if (age < 9 * 60 * 1000) continue;
		try {
			await publishArticle(env.AUTH_DATABASE_URL, a.id, "auto-publish@aignited.id");
			published++;

			// Re-fetch to get published_at + canonical row for the fan-out payload.
			const result = await getArticleBySlug(env.AUTH_DATABASE_URL, a.slug, "institutional");
			if (!result) continue;
			const article = result.article;

			// Telegram first (single call, fast).
			const tg = await broadcastToTelegram(env, article);
			if (tg.ok) telegram = true;
			else console.warn(`[am-brief] telegram failed: ${tg.error}`);

			// Email fan-out.
			const subs = await listEmailSubscribersForType(env.AUTH_DATABASE_URL, "am_brief");
			if (subs.length > 0) {
				const out = await fanoutEmails(
					env,
					article,
					subs.map((s) => ({ email: s.email, name: s.name })),
				);
				emailed += out.sent;
				console.log(`[am-brief] email fan-out: ${out.sent} sent, ${out.failed} failed`);
			}
		} catch (e) {
			console.warn(`[am-brief] publish/fanout failed for ${a.slug}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
	return { published, emailed, telegram };
}
