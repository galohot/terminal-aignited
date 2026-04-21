// Weekly Power Map generator — institutional-tier ownership/flow narrative.
// Surveys KSEI concentration + investor clusters + chord flows + insider
// overlap + broker flow for the past week, prompts the LLM to produce a
// 1000-1500 word piece on who's accumulating and what the network is signaling.
//
// Unlike deep-dive / sector-monthly, this is market-wide — no ticker/sector
// argument. Mirrors the same template: marketFetch → gather → LLM with
// submit-tool → devil's advocate → upsertArticle.

import { challenge, renderContrarianSection } from "./devils-advocate";
import { callLLM, type LLMEnv } from "./llm";
import { upsertArticle } from "./research";
import type { Tool } from "./tools";

interface PowerMapEnv extends LLMEnv {
	API_BASE_URL: string;
	API_KEY: string;
	TERMINAL_API_KEY?: string;
	AUTH_DATABASE_URL: string;
	WORKER_AUTH_SECRET?: string;
}

async function marketFetch<T>(env: PowerMapEnv, path: string): Promise<T | null> {
	const url = new URL(`/api/v1/${path.replace(/^\//, "")}`, env.API_BASE_URL);
	const headers: Record<string, string> = {
		"X-API-Key": env.TERMINAL_API_KEY || env.API_KEY,
	};
	if (env.WORKER_AUTH_SECRET) headers["X-Worker-Auth"] = env.WORKER_AUTH_SECRET;
	const res = await fetch(url.toString(), { headers });
	if (!res.ok) return null;
	return (await res.json()) as T;
}

interface PowerMapSources {
	concentration: unknown;
	clusters: unknown;
	chord: unknown;
	localForeign: unknown;
	topConnectors: unknown;
	brokerFlow: unknown;
	graph: unknown;
}

async function gatherPowerMapSources(env: PowerMapEnv): Promise<PowerMapSources> {
	const [concentration, clusters, chord, localForeign, topConnectors, brokerFlow, graph] =
		await Promise.all([
			marketFetch(env, `idx/ksei/concentration?top_n=50&limit=30`),
			marketFetch(env, `idx/ksei/clusters?min_shared=3`),
			marketFetch(env, `idx/ksei/chord?limit=20`),
			marketFetch(env, `idx/ksei/local-foreign`),
			marketFetch(env, `idx/insiders/top-connectors?limit=20`),
			marketFetch(env, `idx/broker-flow?days=5&limit=15`),
			marketFetch(env, `idx/ksei/graph?top_n=40`),
		]);
	return { concentration, clusters, chord, localForeign, topConnectors, brokerFlow, graph };
}

const SYSTEM_PROMPT = `You are AIgnited Research, writing the weekly Power Map — an institutional-tier intelligence note surveying Indonesian equity ownership, insider networks, and broker flow over the past week.

Audience: fund managers, family offices, institutional allocators. Do not explain what KSEI is or what foreign flow means — they know. Get straight to the signal.

Style: tight, specific, named. No generic disclaimers. No "market participants are watching". Cite entity names, ticker codes, concrete percentages. If data is missing (null), say so.

Length: 1000-1500 words. 6 sections. Markdown ## headings. DO NOT include code blocks.

Required sections:
1. **This week's signal** — 1 paragraph on the dominant network motion
2. **Who's accumulating** — 2-3 investor clusters or named entities with the largest positive position deltas
3. **Broker flow** — top 3 brokers by weekly net-buy, what they're buying, pattern read
4. **Insider overlap** — noteworthy multi-board directors whose companies are co-moving
5. **Local vs foreign** — direction + magnitude of the domestic/foreign swing
6. **Implications** — what this means for positioning next week

Tickers are 4-letter IDX codes (no .JK suffix). Name investor entities as they appear in the source data.

You MUST call the submit_power_map tool exactly once with all fields populated. Do not respond with text — only the tool call.`;

interface ParsedPowerMap {
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
}

const SUBMIT_POWER_MAP_TOOL: Tool = {
	name: "submit_power_map",
	description:
		"Submit the completed weekly Power Map. Call exactly once with all fields populated.",
	input_schema: {
		type: "object",
		properties: {
			title: {
				type: "string",
				description: "Headline, e.g. 'Power Map — Week 17, April 2026'",
			},
			summary: { type: "string", description: "1-2 sentence dek for paywall preview" },
			body_md: {
				type: "string",
				description:
					"Full markdown body, 1000-1500 words, with ## section headings. No code blocks.",
			},
			tickers: {
				type: "array",
				items: { type: "string" },
				description: "Up to 20 IDX codes cited in the piece",
			},
			sectors: {
				type: "array",
				items: { type: "string" },
				description: "Sector labels touched by the narrative; may be empty",
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description:
					"Lowercase snake_case tags. MUST include 'power_map'. Recommended additions: 'ksei', 'insiders', 'broker_flow'.",
			},
		},
		required: ["title", "summary", "body_md", "tickers", "sectors", "tags"],
	},
	dispatch: async () => ({ ok: true, data: null }),
};

function extract(content: Array<{ type: string; [k: string]: unknown }>): ParsedPowerMap | null {
	const tu = content.find((b) => b.type === "tool_use" && b.name === "submit_power_map");
	if (!tu) return null;
	const input = tu.input as Partial<ParsedPowerMap>;
	if (
		typeof input.title === "string" &&
		typeof input.summary === "string" &&
		typeof input.body_md === "string" &&
		Array.isArray(input.tickers) &&
		Array.isArray(input.sectors) &&
		Array.isArray(input.tags)
	) {
		return input as ParsedPowerMap;
	}
	return null;
}

// ISO week number in WIB. Returns `power-map-YYYY-W##`.
function isoWeekSlug(now: Date = new Date()): string {
	const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	// ISO week: Thursday of the same week determines the year.
	const d = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
	const y = d.getUTCFullYear();
	const w = String(weekNum).padStart(2, "0");
	return `power-map-${y}-W${w}`;
}

export async function generatePowerMap(
	env: PowerMapEnv,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
	let sources: PowerMapSources;
	try {
		sources = await gatherPowerMapSources(env);
	} catch (e) {
		return { ok: false, error: `source_fetch: ${e instanceof Error ? e.message : String(e)}` };
	}

	const userMessage = `Source data (JSON) for this week's Power Map:\n\n${JSON.stringify(sources, null, 2)}\n\nWrite the Power Map now by calling submit_power_map.`;

	let llm: Awaited<ReturnType<typeof callLLM>>;
	try {
		llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
			tools: [SUBMIT_POWER_MAP_TOOL],
			maxTokens: 8000,
			temperature: 0.5,
		});
	} catch (e) {
		return { ok: false, error: `llm: ${e instanceof Error ? e.message : String(e)}` };
	}

	const parsed = extract(llm.content as Array<{ type: string; [k: string]: unknown }>);
	if (!parsed) {
		return { ok: false, error: "llm did not call submit_power_map with valid arguments" };
	}

	const contrarian = await challenge(env, {
		ticker: null,
		articleTitle: parsed.title,
		articleSummary: parsed.summary,
		articleBody: parsed.body_md,
	});
	const contrarianSection = renderContrarianSection(contrarian);
	const bodyWithContrarian = contrarianSection
		? `${parsed.body_md}\n\n${contrarianSection}`
		: parsed.body_md;

	const slug = isoWeekSlug();
	try {
		await upsertArticle(env.AUTH_DATABASE_URL, {
			slug,
			type: "power_map",
			title: parsed.title,
			summary: parsed.summary,
			body_md: bodyWithContrarian,
			tickers: parsed.tickers
				.map((t) => t.toUpperCase().replace(/\.JK$/i, ""))
				.filter((t) => /^[A-Z]{3,5}$/.test(t))
				.slice(0, 20),
			sectors: parsed.sectors.map((s) => s.toLowerCase()),
			tags: Array.from(
				new Set([
					"power_map",
					...parsed.tags.map((t) => t.toLowerCase()),
					...(contrarianSection ? ["contrarian"] : []),
				]),
			),
			required_tier: "institutional",
			status: "draft",
			generated_by: llm.provider,
		});
	} catch (e) {
		return { ok: false, error: `upsert: ${e instanceof Error ? e.message : String(e)}` };
	}

	return { ok: true, slug };
}
