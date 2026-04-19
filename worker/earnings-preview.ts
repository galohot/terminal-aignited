// Earnings preview generator. Takes a ticker, pulls last 8 quarters of
// financials + recent disclosures + short price/flow context, writes a
// 500-800 word preview covering what to watch at the upcoming release.

import { callLLM, type LLMEnv } from "./llm";
import { upsertArticle } from "./research";
import type { Tool } from "./tools";

interface PreviewEnv extends LLMEnv {
	API_BASE_URL: string;
	API_KEY: string;
	TERMINAL_API_KEY?: string;
	AUTH_DATABASE_URL: string;
	WORKER_AUTH_SECRET?: string;
}

async function marketFetch<T>(env: PreviewEnv, path: string): Promise<T | null> {
	const url = new URL(`/api/v1/${path.replace(/^\//, "")}`, env.API_BASE_URL);
	const headers: Record<string, string> = {
		"X-API-Key": env.TERMINAL_API_KEY || env.API_KEY,
	};
	if (env.WORKER_AUTH_SECRET) headers["X-Worker-Auth"] = env.WORKER_AUTH_SECRET;
	const res = await fetch(url.toString(), { headers });
	if (!res.ok) return null;
	return (await res.json()) as T;
}

interface PreviewSources {
	ticker: string;
	company: unknown;
	financialsSummary: unknown;
	financialsQuarterly: unknown;
	disclosures: unknown;
	foreignFlow: unknown;
}

async function gatherPreviewSources(env: PreviewEnv, ticker: string): Promise<PreviewSources> {
	const t = encodeURIComponent(ticker);
	const [company, financialsSummary, financialsQuarterly, disclosures, foreignFlow] =
		await Promise.all([
			marketFetch(env, `idx/companies/${t}`),
			marketFetch(env, `idx/financials/${t}/summary`),
			marketFetch(env, `idx/financials/${t}?period=quarterly&limit=8`),
			marketFetch(env, `idx/disclosures?ticker=${t}&limit=10`),
			marketFetch(env, `idx/foreign-flow/${t}?days=20`),
		]);
	return { ticker, company, financialsSummary, financialsQuarterly, disclosures, foreignFlow };
}

const SYSTEM_PROMPT = `You are AIgnited Research, writing an earnings preview for an IDX-listed company.

Style: concise, numbers-first, hedged. No filler. No generic "investors will watch" phrasing. Short paragraphs.

Length: 500-800 words. 3-5 sections. Use markdown ## headings. DO NOT include code blocks.

Required sections:
1. **Setup** — what changed since last print
2. **What to watch** — 3-4 line items the market cares about (revenue growth, NIM/margins, loan book, opex trend — pick what fits this company)
3. **Consensus & whisper** — if you can infer trajectory from trailing 8q, say so. If the data doesn't support a forecast, say "no consensus available" honestly.
4. **Risks** — 2-3 concrete downside scenarios

Cite numbers from the quarterly series. If a field is null, say data unavailable rather than invent. Tickers 4-letter IDX codes (no .JK).

You MUST call the submit_earnings_preview tool exactly once. Do not respond with text — only the tool call.`;

interface ParsedPreview {
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
}

const SUBMIT_TOOL: Tool = {
	name: "submit_earnings_preview",
	description: "Submit the completed earnings preview. Call exactly once with all fields populated.",
	input_schema: {
		type: "object",
		properties: {
			title: { type: "string", description: "Headline, e.g. 'BBCA Q1 2026 preview'" },
			summary: { type: "string", description: "1-2 sentence dek for paywall preview" },
			body_md: {
				type: "string",
				description: "Full markdown body, 500-800 words, with ## headings. No code blocks.",
			},
			tickers: { type: "array", items: { type: "string" }, description: "Subject ticker first." },
			sectors: { type: "array", items: { type: "string" } },
			tags: { type: "array", items: { type: "string" } },
		},
		required: ["title", "summary", "body_md", "tickers", "sectors", "tags"],
	},
	dispatch: async () => ({ ok: true, data: null }),
};

function extract(
	content: Array<{ type: string; [k: string]: unknown }>,
): ParsedPreview | null {
	const tu = content.find((b) => b.type === "tool_use" && b.name === "submit_earnings_preview");
	if (!tu) return null;
	const input = tu.input as Partial<ParsedPreview>;
	if (
		typeof input.title === "string" &&
		typeof input.summary === "string" &&
		typeof input.body_md === "string" &&
		Array.isArray(input.tickers) &&
		Array.isArray(input.sectors) &&
		Array.isArray(input.tags)
	) {
		return input as ParsedPreview;
	}
	return null;
}

function previewSlug(ticker: string, now: Date = new Date()): string {
	const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	const y = wib.getUTCFullYear();
	const q = Math.floor(wib.getUTCMonth() / 3) + 1;
	return `earnings-preview-${ticker.toLowerCase()}-${y}-q${q}`;
}

export async function generateEarningsPreview(
	env: PreviewEnv,
	rawTicker: string,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
	const ticker = rawTicker.trim().toUpperCase().replace(/\.JK$/i, "");
	if (!/^[A-Z]{3,5}$/.test(ticker)) return { ok: false, error: "invalid ticker" };

	let sources: PreviewSources;
	try {
		sources = await gatherPreviewSources(env, ticker);
	} catch (e) {
		return { ok: false, error: `source_fetch: ${e instanceof Error ? e.message : String(e)}` };
	}
	if (!sources.company) return { ok: false, error: `ticker ${ticker} not found` };

	const userMessage = `Subject ticker: ${ticker}\n\nSource data (JSON):\n\n${JSON.stringify(sources, null, 2)}\n\nWrite the earnings preview now by calling submit_earnings_preview.`;

	let llm;
	try {
		llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
			tools: [SUBMIT_TOOL],
			maxTokens: 6000,
			temperature: 0.4,
		});
	} catch (e) {
		return { ok: false, error: `llm: ${e instanceof Error ? e.message : String(e)}` };
	}

	const parsed = extract(llm.content as Array<{ type: string; [k: string]: unknown }>);
	if (!parsed) return { ok: false, error: "llm did not call submit_earnings_preview" };

	const slug = previewSlug(ticker);
	try {
		await upsertArticle(env.AUTH_DATABASE_URL, {
			slug,
			type: "earnings_preview",
			title: parsed.title,
			summary: parsed.summary,
			body_md: parsed.body_md,
			tickers: [ticker, ...parsed.tickers.filter((t) => t.toUpperCase() !== ticker)]
				.map((t) => t.toUpperCase().replace(/\.JK$/i, ""))
				.slice(0, 6),
			sectors: parsed.sectors.map((s) => s.toLowerCase()),
			tags: Array.from(new Set(["earnings_preview", ...parsed.tags.map((t) => t.toLowerCase())])),
			required_tier: "pro",
			status: "draft",
			generated_by: llm.provider,
		});
	} catch (e) {
		return { ok: false, error: `upsert: ${e instanceof Error ? e.message : String(e)}` };
	}

	return { ok: true, slug };
}
