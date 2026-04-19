// SSE streaming agent endpoint.
// Runs a tool-use loop: LLM -> tool_use? -> dispatch -> feed results -> repeat
// Max 8 iterations, max 3 order-mutating calls per conversation.

import { callLLM, type Message } from "./llm";
import { dispatchTool, type ToolCtx, toolsForTier } from "./tools";

const MAX_ITERATIONS = 8;
const MAX_ORDER_CALLS = 3;
const ORDER_MUTATING = new Set(["place_order", "cancel_order"]);

const SYSTEM_PROMPT = `You are the AIgnited Terminal trading copilot for the Indonesia Stock Exchange (IDX).

You help retail investors research IDX-listed companies and — for users on paid tiers — place paper-trade orders.

## Rules
- You operate on IDX data only (957 listed companies, tickers like BBCA, TLKM, ASII — no .JK suffix unless searching).
- Paper trading only: orders execute against a simulated book, not real exchanges. Be explicit about this.
- Integer share math: IDX trades in round lots of 100 shares. Never quote fractional lots.
- Currency: IDR. Express large numbers in M (million) or B (billion). No decimals on IDR.
- Be concise. One or two short paragraphs. Use bullets for lists, not paragraphs.
- Always cite data: "BBCA last 9,850 (quote tool)" not "BBCA is around 9850".
- When a tool returns ok=false, report the error plainly; do not retry unless the user asks.

## When to call tools
- Call tools proactively — the user cannot see raw data unless you fetch it.
- For a "how's X doing" question: get_quote + get_price_history.
- For "should I buy": get_quote + get_financials + get_broker_flow (make no recommendation, just surface data).
- Before place_order: always get_quote first to confirm the user sees current price.
- For portfolio questions: get_portfolio, get_pnl.

## Guardrails
- If UPGRADE_REQUIRED is returned, tell the user the feature requires Starter tier or higher — do not retry.
- Never invent prices, volumes, or news. If a tool fails, say so.
- Never place orders the user did not explicitly authorize with a price and quantity.`;

interface SSEClient {
	send(event: string, data: unknown): void;
	close(): void;
}

function makeSSE(controller: ReadableStreamDefaultController<Uint8Array>): SSEClient {
	const encoder = new TextEncoder();
	let closed = false;
	return {
		send(event: string, data: unknown) {
			if (closed) return;
			const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
			try {
				controller.enqueue(encoder.encode(payload));
			} catch {
				closed = true;
			}
		},
		close() {
			if (closed) return;
			closed = true;
			try {
				controller.close();
			} catch {
				// already closed
			}
		},
	};
}

export interface AgentRunOpts {
	userMessage: string;
	history?: Message[];
	ctx: ToolCtx;
	llmEnv: { MINIMAX_API_KEY?: string; KIMI_API_KEY?: string; OPENROUTER_API_KEY?: string };
}

export function runAgent(opts: AgentRunOpts): Response {
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const sse = makeSSE(controller);
			try {
				await runLoop(opts, sse);
			} catch (e) {
				sse.send("error", { message: e instanceof Error ? e.message : String(e) });
			} finally {
				sse.send("done", {});
				sse.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

async function runLoop(opts: AgentRunOpts, sse: SSEClient): Promise<void> {
	const tools = toolsForTier(opts.ctx.tier);
	const messages: Message[] = [
		...(opts.history ?? []),
		{ role: "user", content: opts.userMessage },
	];

	let orderCalls = 0;

	for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
		const response = await callLLM(opts.llmEnv, {
			system: SYSTEM_PROMPT,
			messages,
			tools,
		});

		sse.send("usage", { provider: response.provider, ...response.usage });

		// Emit text blocks to the UI and collect assistant content for next turn.
		for (const block of response.content) {
			if (block.type === "text" && block.text.trim()) {
				sse.send("message", { text: block.text });
			} else if (block.type === "tool_use") {
				sse.send("tool_call", { id: block.id, name: block.name, input: block.input });
			}
		}

		messages.push({ role: "assistant", content: response.content });

		if (response.stop_reason !== "tool_use") return;

		// Dispatch all tool_use blocks in this turn.
		const toolResults: Array<{
			type: "tool_result";
			tool_use_id: string;
			content: string;
			is_error?: boolean;
		}> = [];

		for (const block of response.content) {
			if (block.type !== "tool_use") continue;

			if (ORDER_MUTATING.has(block.name)) {
				if (orderCalls >= MAX_ORDER_CALLS) {
					const msg = `Order-mutation limit (${MAX_ORDER_CALLS}) reached for this conversation.`;
					sse.send("tool_result", {
						id: block.id,
						name: block.name,
						ok: false,
						error: "RATE_LIMIT",
						message: msg,
					});
					toolResults.push({
						type: "tool_result",
						tool_use_id: block.id,
						content: JSON.stringify({ error: "RATE_LIMIT", message: msg }),
						is_error: true,
					});
					continue;
				}
				orderCalls++;
			}

			const result = await dispatchTool(block.name, block.input, opts.ctx);
			sse.send("tool_result", { id: block.id, name: block.name, ...result });
			toolResults.push({
				type: "tool_result",
				tool_use_id: block.id,
				content: JSON.stringify(
					result.ok ? result.data : { error: result.error, message: result.message },
				),
				is_error: !result.ok,
			});
		}

		messages.push({ role: "user", content: toolResults });
	}

	sse.send("error", { message: `Stopped after ${MAX_ITERATIONS} iterations without final answer` });
}
