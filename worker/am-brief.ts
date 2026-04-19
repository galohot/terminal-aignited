// Daily AM Brief generator — runs at 23:30 UTC (06:30 WIB) via scheduled handler.
// Pulls breadth + movers + sector perf + news from market-api, prompts LLM,
// stores result as a draft research article. A second cron at 23:40 UTC
// auto-publishes any AM brief still in draft (per plan: 10-min grace).

import { callLLM, type LLMEnv } from "./llm";
import { listDrafts, publishArticle, upsertArticle } from "./research";

interface BriefEnv extends LLMEnv {
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

Length: 800-1200 words. 4-6 sections. Use markdown headings (##) and tight paragraphs.

Required sections:
1. **The Setup** — overnight context, what to watch open
2. **Breadth & Flow** — yesterday's tape from the data
3. **Movers** — top gainers/losers worth flagging
4. **Sectors** — what worked / didn't
5. **The Day Ahead** — 2-3 things to watch

Output STRICT JSON in a fenced code block:
\`\`\`json
{
  "title": "...",
  "summary": "1-2 sentence dek",
  "body_md": "## The Setup\\n\\n...full markdown body...",
  "tickers": ["BBCA", "BBRI"],
  "tags": ["am_brief", "ihsg"]
}
\`\`\`

Tickers MUST be 4-letter IDX codes you actually mentioned in the body (no .JK suffix). Tags are lowercase, snake_case.`;

interface ParsedBrief {
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	tags: string[];
}

function extractJson(text: string): ParsedBrief | null {
	const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
	const candidate = fence ? fence[1] : text;
	try {
		const parsed = JSON.parse(candidate.trim()) as ParsedBrief;
		if (
			typeof parsed.title === "string" &&
			typeof parsed.summary === "string" &&
			typeof parsed.body_md === "string" &&
			Array.isArray(parsed.tickers) &&
			Array.isArray(parsed.tags)
		) {
			return parsed;
		}
	} catch {
		return null;
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

	const userMessage = `Today's source data (JSON):\n\n${JSON.stringify(sources, null, 2)}\n\nGenerate the AM Brief now.`;

	let llm;
	try {
		llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
			tools: [],
			maxTokens: 4000,
			temperature: 0.4,
		});
	} catch (e) {
		return { ok: false, error: `llm: ${e instanceof Error ? e.message : String(e)}` };
	}

	const text = llm.content
		.filter((b): b is { type: "text"; text: string } => b.type === "text")
		.map((b) => b.text)
		.join("\n");

	const brief = extractJson(text);
	if (!brief) {
		return { ok: false, error: "llm output did not contain valid JSON brief" };
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
export async function autoPublishStaleAmBriefs(env: BriefEnv): Promise<{ published: number }> {
	const drafts = await listDrafts(env.AUTH_DATABASE_URL);
	const now = Date.now();
	let published = 0;
	for (const a of drafts) {
		if (a.type !== "am_brief") continue;
		if (a.status !== "draft") continue;
		const age = now - new Date(a.created_at).getTime();
		if (age < 9 * 60 * 1000) continue;
		try {
			await publishArticle(env.AUTH_DATABASE_URL, a.id, "auto-publish@aignited.id");
			published++;
		} catch {
			// best-effort; will retry next tick
		}
	}
	return { published };
}
