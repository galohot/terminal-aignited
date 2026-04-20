// Devil's Advocate — stress-tests a generated research article with a single
// extra LLM pass, returns a ContrarianView structure that gets rendered as a
// "## Contrarian View" section appended to body_md before publish.
//
// Failure mode: any error (all 3 providers down, tool not called, malformed
// input) returns an empty view. Caller then skips the section — never blocks
// publish on this step.

import { callLLM, type LLMEnv } from "./llm";
import type { Tool } from "./tools";

export interface ContrarianSignal {
	description: string;
	direction: "bullish" | "bearish" | "neutral";
	confidence: number;
	evidence: string;
}

export interface ContrarianView {
	challenges: string[];
	overlooked_risks: string[];
	contrarian_signals: ContrarianSignal[];
}

const EMPTY_VIEW: ContrarianView = {
	challenges: [],
	overlooked_risks: [],
	contrarian_signals: [],
};

const SYSTEM_PROMPT = `You are a skeptical senior portfolio manager reviewing a junior analyst's IDX research note. Your job is to stress-test the thesis, not agree with it. Be constructive but rigorous. Do NOT simply negate findings — provide reasoning. Output via submit_contrarian_view tool only.`;

const SUBMIT_CONTRARIAN_TOOL: Tool = {
	name: "submit_contrarian_view",
	description:
		"Submit the contrarian review of the article. Call exactly once with all fields populated.",
	input_schema: {
		type: "object",
		properties: {
			challenges: {
				type: "array",
				items: { type: "string" },
				description:
					"2-4 specific objections to bullish claims in the article. Each should cite what the analyst overlooked and explain the reasoning, not just negate.",
			},
			overlooked_risks: {
				type: "array",
				items: { type: "string" },
				description: "1-3 risks the article did not mention that should have been flagged.",
			},
			contrarian_signals: {
				type: "array",
				items: {
					type: "object",
					properties: {
						description: { type: "string", description: "Short description of the signal." },
						direction: {
							type: "string",
							enum: ["bullish", "bearish", "neutral"],
							description: "Direction of the contrarian signal.",
						},
						confidence: {
							type: "number",
							description: "Confidence 0.0 to 1.0.",
						},
						evidence: {
							type: "string",
							description: "Reasoning based on data in the article or general knowledge.",
						},
					},
					required: ["description", "direction", "confidence", "evidence"],
				},
				description: "1-3 genuinely important contrarian signals. No filler.",
			},
		},
		required: ["challenges", "overlooked_risks", "contrarian_signals"],
	},
	dispatch: async () => ({ ok: true, data: null }),
};

function buildUserPrompt(opts: {
	ticker: string | null;
	articleTitle: string;
	articleSummary: string;
	articleBody: string;
}): string {
	return `## Article under review
Title: ${opts.articleTitle}
Ticker: ${opts.ticker ?? "market-wide"}
Summary: ${opts.articleSummary}

## Full article body
${opts.articleBody}

Your task:
1. For each bullish claim, identify what could go wrong or what's overlooked
2. For each bearish claim, consider if it's overstated or has mitigating factors
3. Flag risks the article did not mention

Constraints:
- 2-4 challenges, focused on the strongest objections
- 1-3 overlooked risks
- 1-3 contrarian signals (genuinely important, not filler)
- Do NOT simply negate findings — provide reasoning

Call submit_contrarian_view exactly once.`;
}

function extract(content: Array<{ type: string; [k: string]: unknown }>): ContrarianView | null {
	const tu = content.find((b) => b.type === "tool_use" && b.name === "submit_contrarian_view");
	if (!tu) return null;
	const input = tu.input as Partial<ContrarianView>;
	if (
		!Array.isArray(input.challenges) ||
		!Array.isArray(input.overlooked_risks) ||
		!Array.isArray(input.contrarian_signals)
	) {
		return null;
	}
	const challenges = input.challenges.filter((c): c is string => typeof c === "string");
	const overlooked_risks = input.overlooked_risks.filter((r): r is string => typeof r === "string");
	const contrarian_signals = input.contrarian_signals.filter(
		(s): s is ContrarianSignal =>
			typeof s === "object" &&
			s !== null &&
			typeof (s as ContrarianSignal).description === "string" &&
			typeof (s as ContrarianSignal).evidence === "string" &&
			typeof (s as ContrarianSignal).confidence === "number" &&
			(s as ContrarianSignal).direction != null &&
			["bullish", "bearish", "neutral"].includes((s as ContrarianSignal).direction),
	);
	return { challenges, overlooked_risks, contrarian_signals };
}

export async function challenge(
	env: LLMEnv,
	opts: {
		ticker: string | null;
		articleTitle: string;
		articleSummary: string;
		articleBody: string;
	},
): Promise<ContrarianView> {
	try {
		const llm = await callLLM(env, {
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: buildUserPrompt(opts) }],
			tools: [SUBMIT_CONTRARIAN_TOOL],
			maxTokens: 2000,
			temperature: 0.5,
		});
		const parsed = extract(llm.content as Array<{ type: string; [k: string]: unknown }>);
		return parsed ?? EMPTY_VIEW;
	} catch {
		return EMPTY_VIEW;
	}
}

function capitalize(s: string): string {
	return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

export function renderContrarianSection(view: ContrarianView): string {
	const hasContent =
		view.challenges.length > 0 ||
		view.overlooked_risks.length > 0 ||
		view.contrarian_signals.length > 0;
	if (!hasContent) return "";

	const lines: string[] = [
		"## Contrarian View",
		"",
		"_Stress-test of the thesis above. Generated by AIgnited Research alongside the main analysis._",
		"",
	];

	if (view.challenges.length > 0) {
		lines.push("**Challenges to the thesis:**");
		for (const c of view.challenges) lines.push(`- ${c}`);
		lines.push("");
	}

	if (view.overlooked_risks.length > 0) {
		lines.push("**Overlooked risks:**");
		for (const r of view.overlooked_risks) lines.push(`- ${r}`);
		lines.push("");
	}

	if (view.contrarian_signals.length > 0) {
		lines.push("**Contrarian signals:**");
		for (const s of view.contrarian_signals) {
			const conf = Math.max(0, Math.min(1, s.confidence)).toFixed(2);
			lines.push(
				`- _${capitalize(s.direction)}, ${conf} confidence:_ ${s.description} Evidence: ${s.evidence}`,
			);
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}
