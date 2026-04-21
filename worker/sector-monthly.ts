// Monthly sector deep-dive generator. Picks one sector, pulls aggregate
// performance + constituents + flow + bellwether ownership mix, prompts the
// LLM to write a 2500-4000 word markdown article, stores as Pro-gated draft.
//
// Mirrors worker/deep-dive.ts — if you're changing the template (prompts,
// tool-use shape, contrarian append), change it in both.

import { challenge, renderContrarianSection } from "./devils-advocate";
import { callLLM, type LLMEnv } from "./llm";
import { upsertArticle } from "./research";
import type { Tool } from "./tools";

interface SectorEnv extends LLMEnv {
	API_BASE_URL: string;
	API_KEY: string;
	TERMINAL_API_KEY?: string;
	AUTH_DATABASE_URL: string;
	WORKER_AUTH_SECRET?: string;
}

async function marketFetch<T>(env: SectorEnv, path: string): Promise<T | null> {
	const url = new URL(`/api/v1/${path.replace(/^\//, "")}`, env.API_BASE_URL);
	const headers: Record<string, string> = {
		"X-API-Key": env.TERMINAL_API_KEY || env.API_KEY,
	};
	if (env.WORKER_AUTH_SECRET) headers["X-Worker-Auth"] = env.WORKER_AUTH_SECRET;
	const res = await fetch(url.toString(), { headers });
	if (!res.ok) return null;
	return (await res.json()) as T;
}

interface SectorSources {
	sector: string;
	sectorsPerformance: unknown;
	constituents: unknown;
	topByCap: unknown;
	flowLeaders: unknown;
	marketBreadth: unknown;
	bellwetherTicker: string | null;
	bellwetherOwnership: unknown;
}

// Pulls the top-cap ticker from the `topByCap` screener payload. The screener
// endpoint returns `{ rows: [{ kode_emiten, ...}] }` so we sniff that shape
// defensively — nothing else depends on it if it fails.
function pickBellwether(topByCap: unknown): string | null {
	if (!topByCap || typeof topByCap !== "object") return null;
	const rows = (topByCap as { rows?: unknown }).rows;
	if (!Array.isArray(rows) || rows.length === 0) return null;
	const first = rows[0];
	if (typeof first !== "object" || first === null) return null;
	const kode = (first as { kode_emiten?: unknown }).kode_emiten;
	return typeof kode === "string" && /^[A-Z]{3,5}$/.test(kode) ? kode : null;
}

async function gatherSectorSources(env: SectorEnv, sector: string): Promise<SectorSources> {
	const s = encodeURIComponent(sector);
	const [sectorsPerformance, constituents, topByCap, flowLeaders, marketBreadth] =
		await Promise.all([
			marketFetch(env, `idx/sectors/performance`),
			marketFetch(env, `idx/companies?sector=${s}&limit=100`),
			marketFetch(env, `idx/screener?sector=${s}&sort_by=market_cap&sort_order=desc&limit=20`),
			marketFetch(env, `idx/screener/movers?sector=${s}&window=20d&limit=10`),
			marketFetch(env, `idx/market-breadth`),
		]);

	const bellwetherTicker = pickBellwether(topByCap);
	const bellwetherOwnership = bellwetherTicker
		? await marketFetch(env, `idx/ksei/treemap/${encodeURIComponent(bellwetherTicker)}`)
		: null;

	return {
		sector,
		sectorsPerformance,
		constituents,
		topByCap,
		flowLeaders,
		marketBreadth,
		bellwetherTicker,
		bellwetherOwnership,
	};
}

const SYSTEM_PROMPT = `You are AIgnited Research, writing a monthly sector deep-dive for Indonesian equities (IDX-listed).

Style: analyst-grade, hedged, specific. Lead with the sector thesis in one paragraph. Then the data. No filler, no generic disclaimers, no "market participants will be watching". Short paragraphs. Concrete numbers from the sources.

Length: 2500-4000 words. 7 sections. Use markdown ## headings. DO NOT include code blocks (triple backticks).

Required sections:
1. **Thesis** — 1 paragraph, the sector call this month
2. **Market context** — sector vs market YTD / 1d / 5d / 20d, breadth
3. **Leaders & laggards** — top 3 winners and top 3 losers by 20d return, with numbers
4. **Fundamentals snapshot** — aggregate P/E, ROE, margin trend across the top 10 by market cap
5. **Flow & ownership** — foreign 20d net, top broker buyers in the sector, notable KSEI concentration shifts on the bellwether
6. **Risks** — 2-3 concrete sector risks
7. **What would change our mind** — bull and bear catalysts

Cite concrete numbers. If a data field is missing (null), say so rather than invent. Tickers are 4-letter IDX codes (no .JK suffix).

You MUST call the submit_sector_monthly tool exactly once with all fields populated. Do not respond with text — only the tool call.`;

interface ParsedSectorMonthly {
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
}

const SUBMIT_SECTOR_MONTHLY_TOOL: Tool = {
	name: "submit_sector_monthly",
	description:
		"Submit the completed sector monthly article. Call exactly once with all fields populated.",
	input_schema: {
		type: "object",
		properties: {
			title: {
				type: "string",
				description: "Headline, e.g. 'Indonesian banks — April 2026 monthly'",
			},
			summary: { type: "string", description: "1-2 sentence dek for paywall preview" },
			body_md: {
				type: "string",
				description:
					"Full markdown body, 2500-4000 words, with ## section headings. No code blocks.",
			},
			tickers: {
				type: "array",
				items: { type: "string" },
				description: "Up to 15 IDX codes discussed. Include the bellwether first.",
			},
			sectors: {
				type: "array",
				items: { type: "string" },
				description: "Sector label(s); typically the single target sector",
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description:
					"Lowercase snake_case tags. MUST include 'sector_monthly' and the sector label.",
			},
		},
		required: ["title", "summary", "body_md", "tickers", "sectors", "tags"],
	},
	dispatch: async () => ({ ok: true, data: null }),
};

function extract(
	content: Array<{ type: string; [k: string]: unknown }>,
): ParsedSectorMonthly | null {
	const tu = content.find((b) => b.type === "tool_use" && b.name === "submit_sector_monthly");
	if (!tu) return null;
	const input = tu.input as Partial<ParsedSectorMonthly>;
	if (
		typeof input.title === "string" &&
		typeof input.summary === "string" &&
		typeof input.body_md === "string" &&
		Array.isArray(input.tickers) &&
		Array.isArray(input.sectors) &&
		Array.isArray(input.tags)
	) {
		return input as ParsedSectorMonthly;
	}
	return null;
}

function monthSlug(sector: string, now: Date = new Date()): string {
	const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	const y = wib.getUTCFullYear();
	const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
	const safe = sector
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
	return `sector-monthly-${safe}-${y}-${m}`;
}

export async function generateSectorMonthly(
	env: SectorEnv,
	rawSector: string,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
	const sector = rawSector.trim();
	if (!sector) {
		return { ok: false, error: "empty sector" };
	}

	let sources: SectorSources;
	try {
		sources = await gatherSectorSources(env, sector);
	} catch (e) {
		return { ok: false, error: `source_fetch: ${e instanceof Error ? e.message : String(e)}` };
	}

	const constituents = sources.constituents as { total?: number; rows?: unknown[] } | null;
	if (!constituents || !Array.isArray(constituents.rows) || constituents.rows.length === 0) {
		return { ok: false, error: `sector '${sector}' has no constituents` };
	}

	const userMessage = `Target sector: ${sector}\n\nSource data (JSON):\n\n${JSON.stringify(sources, null, 2)}\n\nWrite the sector monthly now by calling submit_sector_monthly.`;

	let llm: Awaited<ReturnType<typeof callLLM>>;
	try {
		llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
			tools: [SUBMIT_SECTOR_MONTHLY_TOOL],
			maxTokens: 16000,
			temperature: 0.4,
		});
	} catch (e) {
		return { ok: false, error: `llm: ${e instanceof Error ? e.message : String(e)}` };
	}

	const parsed = extract(llm.content as Array<{ type: string; [k: string]: unknown }>);
	if (!parsed) {
		return { ok: false, error: "llm did not call submit_sector_monthly with valid arguments" };
	}

	const contrarian = await challenge(env, {
		ticker: sources.bellwetherTicker,
		articleTitle: parsed.title,
		articleSummary: parsed.summary,
		articleBody: parsed.body_md,
	});
	const contrarianSection = renderContrarianSection(contrarian);
	const bodyWithContrarian = contrarianSection
		? `${parsed.body_md}\n\n${contrarianSection}`
		: parsed.body_md;

	const slug = monthSlug(sector);
	try {
		await upsertArticle(env.AUTH_DATABASE_URL, {
			slug,
			type: "sector",
			title: parsed.title,
			summary: parsed.summary,
			body_md: bodyWithContrarian,
			tickers: parsed.tickers
				.map((t) => t.toUpperCase().replace(/\.JK$/i, ""))
				.filter((t) => /^[A-Z]{3,5}$/.test(t))
				.slice(0, 15),
			sectors: Array.from(
				new Set([sector.toLowerCase(), ...parsed.sectors.map((s) => s.toLowerCase())]),
			),
			tags: Array.from(
				new Set([
					"sector_monthly",
					sector.toLowerCase(),
					...parsed.tags.map((t) => t.toLowerCase()),
					...(contrarianSection ? ["contrarian"] : []),
				]),
			),
			required_tier: "pro",
			status: "draft",
			generated_by: llm.provider,
		});
	} catch (e) {
		return { ok: false, error: `upsert: ${e instanceof Error ? e.message : String(e)}` };
	}

	return { ok: true, slug };
}
