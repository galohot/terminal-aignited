// LLM adapter for the agent loop.
// Order:
//   1. MiniMax M2.7 via Anthropic-compatible endpoint (primary)
//   2. Kimi K2 Turbo via Kimi Code Anthropic-compatible endpoint (fallback)
//   3. OpenRouter free-tier cascade (last resort)
// All providers normalize to the Anthropic-style shape below.

import type { Tool } from "./tools";

export type ContentBlock =
	| { type: "text"; text: string }
	| { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

export interface LLMResponse {
	content: ContentBlock[];
	stop_reason: "end_turn" | "tool_use" | "max_tokens" | "error";
	usage: { prompt_tokens: number; completion_tokens: number };
	provider: "minimax" | "kimi" | "openrouter";
}

export type MessageRole = "user" | "assistant";

// Content sent back to the LLM. User messages carry text or tool_result blocks;
// assistant messages replay prior content (text + tool_use).
export type RequestContent =
	| string
	| Array<
			| { type: "text"; text: string }
			| { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
			| { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }
	  >;

export interface Message {
	role: MessageRole;
	content: RequestContent;
}

export interface LLMEnv {
	MINIMAX_API_KEY?: string;
	KIMI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
}

export interface CallOpts {
	system: string;
	messages: Message[];
	tools: Tool[];
	maxTokens?: number;
	temperature?: number;
}

// ---- Anthropic-shape caller (used by MiniMax + Kimi) -------------------

interface AnthropicCallConfig {
	url: string;
	apiKey: string;
	model: string;
	provider: LLMResponse["provider"];
	extraHeaders?: Record<string, string>;
}

async function callAnthropicShape(
	cfg: AnthropicCallConfig,
	opts: CallOpts,
): Promise<LLMResponse> {
	const body = {
		model: cfg.model,
		max_tokens: opts.maxTokens ?? 2048,
		temperature: opts.temperature ?? 0.3,
		system: opts.system,
		messages: opts.messages,
		tools: opts.tools.map((t) => ({
			name: t.name,
			description: t.description,
			input_schema: t.input_schema,
		})),
	};

	const response = await fetch(cfg.url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": cfg.apiKey,
			"anthropic-version": "2023-06-01",
			...(cfg.extraHeaders ?? {}),
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`${cfg.provider} ${response.status}: ${text.slice(0, 300)}`);
	}

	const json = (await response.json()) as {
		content: Array<
			| { type: "text"; text: string }
			| { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
		>;
		stop_reason: string;
		usage: { input_tokens: number; output_tokens: number };
	};

	return {
		content: json.content,
		stop_reason: normalizeStopReason(json.stop_reason),
		usage: {
			prompt_tokens: json.usage.input_tokens,
			completion_tokens: json.usage.output_tokens,
		},
		provider: cfg.provider,
	};
}

// ---- Primary: MiniMax M2.7 (Anthropic-compatible) ----------------------

async function callMiniMax(env: LLMEnv, opts: CallOpts): Promise<LLMResponse> {
	if (!env.MINIMAX_API_KEY) throw new Error("MINIMAX_API_KEY missing");
	return callAnthropicShape(
		{
			url: "https://api.minimax.io/anthropic/v1/messages",
			apiKey: env.MINIMAX_API_KEY,
			model: "MiniMax-M2.7",
			provider: "minimax",
		},
		opts,
	);
}

// ---- Fallback: Kimi Code (Anthropic-compatible) ------------------------

async function callKimi(env: LLMEnv, opts: CallOpts): Promise<LLMResponse> {
	if (!env.KIMI_API_KEY) throw new Error("KIMI_API_KEY missing");
	return callAnthropicShape(
		{
			url: "https://api.kimi.com/coding/v1/messages",
			apiKey: env.KIMI_API_KEY,
			model: "kimi-k2-turbo-preview",
			provider: "kimi",
			// Kimi's Cloudflare WAF returns 403 to bare worker requests; identify as kimi-cli.
			extraHeaders: { "User-Agent": "kimi-cli/1.0" },
		},
		opts,
	);
}

// ---- Last resort: OpenRouter free-tier cascade -------------------------

interface OpenAIMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: { name: string; arguments: string };
	}>;
	tool_call_id?: string;
}

function anthropicMessagesToOpenAI(system: string, messages: Message[]): OpenAIMessage[] {
	const out: OpenAIMessage[] = [{ role: "system", content: system }];
	for (const m of messages) {
		if (typeof m.content === "string") {
			out.push({ role: m.role, content: m.content });
			continue;
		}
		if (m.role === "assistant") {
			const textParts: string[] = [];
			const toolCalls: OpenAIMessage["tool_calls"] = [];
			for (const b of m.content) {
				if (b.type === "text") textParts.push(b.text);
				else if (b.type === "tool_use")
					toolCalls.push({
						id: b.id,
						type: "function",
						function: { name: b.name, arguments: JSON.stringify(b.input) },
					});
			}
			out.push({
				role: "assistant",
				content: textParts.length ? textParts.join("\n") : null,
				...(toolCalls.length ? { tool_calls: toolCalls } : {}),
			});
		} else {
			// user: may contain tool_result blocks and/or text
			for (const b of m.content) {
				if (b.type === "tool_result") {
					out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.content });
				} else if (b.type === "text") {
					out.push({ role: "user", content: b.text });
				}
			}
		}
	}
	return out;
}

// Free models with tool support, ranked by context length & reliability.
// Cascaded inside OpenRouter so a single rate-limited model doesn't kill the request.
const OPENROUTER_FREE_MODELS = [
	"qwen/qwen3-coder:free",
	"z-ai/glm-4.5-air:free",
	"openai/gpt-oss-120b:free",
	"meta-llama/llama-3.3-70b-instruct:free",
] as const;

async function callOpenRouterModel(
	env: LLMEnv,
	opts: CallOpts,
	model: string,
): Promise<LLMResponse> {
	const body = {
		model,
		messages: anthropicMessagesToOpenAI(opts.system, opts.messages),
		temperature: opts.temperature ?? 0.3,
		max_tokens: opts.maxTokens ?? 2048,
		tools: opts.tools.map((t) => ({
			type: "function",
			function: {
				name: t.name,
				description: t.description,
				parameters: t.input_schema,
			},
		})),
	};

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"HTTP-Referer": "https://terminal.aignited.id",
			"X-Title": "AIgnited Terminal",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`OpenRouter[${model}] ${response.status}: ${text.slice(0, 300)}`);
	}

	const json = (await response.json()) as {
		choices: Array<{
			message: {
				content: string | null;
				tool_calls?: Array<{
					id: string;
					function: { name: string; arguments: string };
				}>;
			};
			finish_reason: string;
		}>;
		usage?: { prompt_tokens: number; completion_tokens: number };
	};

	const msg = json.choices[0]?.message;
	if (!msg) throw new Error(`OpenRouter[${model}]: no choice returned`);

	const content: ContentBlock[] = [];
	if (msg.content) content.push({ type: "text", text: msg.content });
	if (msg.tool_calls) {
		for (const tc of msg.tool_calls) {
			let input: Record<string, unknown> = {};
			try {
				input = JSON.parse(tc.function.arguments || "{}");
			} catch {
				input = {};
			}
			content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
		}
	}

	return {
		content,
		stop_reason: normalizeStopReason(json.choices[0].finish_reason),
		usage: {
			prompt_tokens: json.usage?.prompt_tokens ?? 0,
			completion_tokens: json.usage?.completion_tokens ?? 0,
		},
		provider: "openrouter",
	};
}

async function callOpenRouter(env: LLMEnv, opts: CallOpts): Promise<LLMResponse> {
	if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing");
	const errors: string[] = [];
	for (const model of OPENROUTER_FREE_MODELS) {
		try {
			return await callOpenRouterModel(env, opts, model);
		} catch (e) {
			errors.push(e instanceof Error ? e.message : String(e));
		}
	}
	throw new Error(`OpenRouter free cascade exhausted:\n${errors.join("\n")}`);
}

function normalizeStopReason(raw: string): LLMResponse["stop_reason"] {
	switch (raw) {
		case "end_turn":
		case "stop":
			return "end_turn";
		case "tool_use":
		case "tool_calls":
			return "tool_use";
		case "max_tokens":
		case "length":
			return "max_tokens";
		default:
			return "end_turn";
	}
}

// ---- Public: try providers in order -----------------------------------

export async function callLLM(env: LLMEnv, opts: CallOpts): Promise<LLMResponse> {
	const errors: string[] = [];
	for (const provider of ["minimax", "kimi", "openrouter"] as const) {
		try {
			if (provider === "minimax") return await callMiniMax(env, opts);
			if (provider === "kimi") return await callKimi(env, opts);
			return await callOpenRouter(env, opts);
		} catch (e) {
			errors.push(`${provider}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}
	throw new Error(`All LLM providers failed:\n${errors.join("\n")}`);
}
