// Weekly company deep-dive generator. Takes a ticker, pulls fundamentals +
// insider activity + broker flow + recent disclosures + peers, prompts the
// LLM to write a 1500-2500 word markdown article, stores as Pro-gated draft.

import { callLLM, type LLMEnv } from "./llm";
import { upsertArticle } from "./research";
import type { Tool } from "./tools";

interface DeepDiveEnv extends LLMEnv {
	API_BASE_URL: string;
	API_KEY: string;
	TERMINAL_API_KEY?: string;
	AUTH_DATABASE_URL: string;
	WORKER_AUTH_SECRET?: string;
}

async function marketFetch<T>(env: DeepDiveEnv, path: string): Promise<T | null> {
	const url = new URL(`/api/v1/${path.replace(/^\//, "")}`, env.API_BASE_URL);
	const headers: Record<string, string> = {
		"X-API-Key": env.TERMINAL_API_KEY || env.API_KEY,
	};
	if (env.WORKER_AUTH_SECRET) headers["X-Worker-Auth"] = env.WORKER_AUTH_SECRET;
	const res = await fetch(url.toString(), { headers });
	if (!res.ok) return null;
	return (await res.json()) as T;
}

interface DeepDiveSources {
	ticker: string;
	company: unknown;
	financials: unknown;
	insiders: unknown;
	brokerSummary: unknown;
	foreignFlow: unknown;
	disclosures: unknown;
	peers: unknown;
}

async function gatherDeepDiveSources(
	env: DeepDiveEnv,
	ticker: string,
): Promise<DeepDiveSources> {
	const t = encodeURIComponent(ticker);
	const [company, financials, insiders, brokerSummary, foreignFlow, disclosures, peers] =
		await Promise.all([
			marketFetch(env, `idx/companies/${t}`),
			marketFetch(env, `idx/financials/${t}/summary`),
			marketFetch(env, `idx/insiders/${t}`),
			marketFetch(env, `idx/broker-summary/${t}?days=20`),
			marketFetch(env, `idx/foreign-flow/${t}?days=20`),
			marketFetch(env, `idx/disclosures?ticker=${t}&limit=10`),
			marketFetch(env, `idx/peers/${t}`),
		]);
	return { ticker, company, financials, insiders, brokerSummary, foreignFlow, disclosures, peers };
}

const SYSTEM_PROMPT = `You are AIgnited Research, writing a weekly company deep-dive for an Indonesian equity (IDX-listed).

Style: analyst-grade, hedged, specific. Lead with the investment thesis in one paragraph. Then the data. No filler, no generic disclaimers, no "market participants will be watching". Short paragraphs. Concrete numbers from the sources.

Length: 1500-2500 words. 5-7 sections. Use markdown ## headings. DO NOT include code blocks (triple backticks).

Required sections:
1. **Thesis** — 1 paragraph, what's the setup right now
2. **Business** — what the company does, revenue mix if visible
3. **Fundamentals** — recent earnings, margin trend, balance sheet
4. **Flow & Ownership** — foreign flow, top brokers, insider moves, recent disclosures
5. **Peers** — how it compares
6. **Risks** — 2-3 concrete risks
7. **What would change our mind** — bull and bear catalysts

Cite concrete numbers. If data is missing (null), say so rather than invent. Tickers are 4-letter IDX codes (no .JK suffix).

You MUST call the submit_deep_dive tool exactly once with all fields populated. Do not respond with text — only the tool call.`;

interface ParsedDeepDive {
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
}

const SUBMIT_DEEP_DIVE_TOOL: Tool = {
	name: "submit_deep_dive",
	description: "Submit the completed deep-dive. Call exactly once with all fields populated.",
	input_schema: {
		type: "object",
		properties: {
			title: { type: "string", description: "Headline, e.g. 'BBCA deep-dive — April 2026'" },
			summary: { type: "string", description: "1-2 sentence dek for paywall preview" },
			body_md: {
				type: "string",
				description: "Full markdown body, 1500-2500 words, with ## section headings. No code blocks.",
			},
			tickers: {
				type: "array",
				items: { type: "string" },
				description: "4-letter IDX codes featured. Include the subject ticker first.",
			},
			sectors: {
				type: "array",
				items: { type: "string" },
				description: "Sector labels, e.g. ['banks']",
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description: "Lowercase snake_case tags, e.g. ['deep_dive','banks']",
			},
		},
		required: ["title", "summary", "body_md", "tickers", "sectors", "tags"],
	},
	dispatch: async () => ({ ok: true, data: null }),
};

function extract(
	content: Array<{ type: string; [k: string]: unknown }>,
): ParsedDeepDive | null {
	const tu = content.find((b) => b.type === "tool_use" && b.name === "submit_deep_dive");
	if (!tu) return null;
	const input = tu.input as Partial<ParsedDeepDive>;
	if (
		typeof input.title === "string" &&
		typeof input.summary === "string" &&
		typeof input.body_md === "string" &&
		Array.isArray(input.tickers) &&
		Array.isArray(input.sectors) &&
		Array.isArray(input.tags)
	) {
		return input as ParsedDeepDive;
	}
	return null;
}

function monthSlug(ticker: string, now: Date = new Date()): string {
	const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	const y = wib.getUTCFullYear();
	const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
	return `deep-dive-${ticker.toLowerCase()}-${y}-${m}`;
}

export async function generateDeepDive(
	env: DeepDiveEnv,
	rawTicker: string,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
	const ticker = rawTicker.trim().toUpperCase().replace(/\.JK$/i, "");
	if (!/^[A-Z]{3,5}$/.test(ticker)) {
		return { ok: false, error: "invalid ticker" };
	}

	let sources: DeepDiveSources;
	try {
		sources = await gatherDeepDiveSources(env, ticker);
	} catch (e) {
		return { ok: false, error: `source_fetch: ${e instanceof Error ? e.message : String(e)}` };
	}
	if (!sources.company) {
		return { ok: false, error: `ticker ${ticker} not found in company detail` };
	}

	const userMessage = `Subject ticker: ${ticker}\n\nSource data (JSON):\n\n${JSON.stringify(sources, null, 2)}\n\nWrite the deep-dive now by calling submit_deep_dive.`;

	let llm;
	try {
		llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
			tools: [SUBMIT_DEEP_DIVE_TOOL],
			maxTokens: 12000,
			temperature: 0.4,
		});
	} catch (e) {
		return { ok: false, error: `llm: ${e instanceof Error ? e.message : String(e)}` };
	}

	const parsed = extract(llm.content as Array<{ type: string; [k: string]: unknown }>);
	if (!parsed) {
		return { ok: false, error: "llm did not call submit_deep_dive tool with valid arguments" };
	}

	const slug = monthSlug(ticker);
	try {
		await upsertArticle(env.AUTH_DATABASE_URL, {
			slug,
			type: "deep_dive",
			title: parsed.title,
			summary: parsed.summary,
			body_md: parsed.body_md,
			tickers: [ticker, ...parsed.tickers.filter((t) => t.toUpperCase() !== ticker)]
				.map((t) => t.toUpperCase().replace(/\.JK$/i, ""))
				.slice(0, 10),
			sectors: parsed.sectors.map((s) => s.toLowerCase()),
			tags: Array.from(new Set(["deep_dive", ...parsed.tags.map((t) => t.toLowerCase())])),
			required_tier: "pro",
			status: "draft",
			generated_by: llm.provider,
		});
	} catch (e) {
		return { ok: false, error: `upsert: ${e instanceof Error ? e.message : String(e)}` };
	}

	return { ok: true, slug };
}
