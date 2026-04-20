import { useCallback, useRef, useState } from "react";
import type { AgentStoredMessage } from "../lib/api";

// Matches worker/agent.ts event shape.
export type ChatTurn =
	| {
			role: "user";
			text: string;
			id: string;
	  }
	| {
			role: "assistant";
			id: string;
			blocks: AssistantBlock[];
			provider?: string;
	  };

export type AssistantBlock =
	| { type: "text"; text: string }
	| {
			type: "tool";
			id: string;
			name: string;
			input: Record<string, unknown>;
			status: "running" | "ok" | "error";
			output?: unknown;
			errorCode?: string;
			errorMessage?: string;
	  };

export interface Citation {
	slug: string;
	title: string;
	type: string;
	summary: string;
	tickers: string[];
	sectors: string[];
	required_tier: "starter" | "pro" | "institutional";
	published_at: string | null;
	gated: boolean;
}

// Walk turns and collect unique research_search hits in order of first mention.
export function extractCitations(turns: ChatTurn[]): Citation[] {
	const seen = new Map<string, Citation>();
	for (const turn of turns) {
		if (turn.role !== "assistant") continue;
		for (const block of turn.blocks) {
			if (block.type !== "tool" || block.name !== "research_search" || block.status !== "ok")
				continue;
			const out = block.output as { data?: { hits?: unknown } } | undefined;
			const hits = out?.data?.hits;
			if (!Array.isArray(hits)) continue;
			for (const raw of hits) {
				if (!raw || typeof raw !== "object") continue;
				const h = raw as Record<string, unknown>;
				const slug = typeof h.slug === "string" ? h.slug : null;
				if (!slug || seen.has(slug)) continue;
				seen.set(slug, {
					slug,
					title: typeof h.title === "string" ? h.title : slug,
					type: typeof h.type === "string" ? h.type : "",
					summary: typeof h.summary === "string" ? h.summary : "",
					tickers: Array.isArray(h.tickers) ? (h.tickers as string[]) : [],
					sectors: Array.isArray(h.sectors) ? (h.sectors as string[]) : [],
					required_tier:
						(h.required_tier as Citation["required_tier"]) ?? "starter",
					published_at: typeof h.published_at === "string" ? h.published_at : null,
					gated: h.gated === true,
				});
			}
		}
	}
	return [...seen.values()];
}

type ChatError = { message: string };

interface SSEEvent {
	event: string;
	data: unknown;
}

function nextId(): string {
	return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Convert stored Anthropic-shaped messages into the Turn[] the UI renders.
// user+string = user turn; user+array (tool_results) = hydrate prior assistant's tool blocks;
// assistant+array = assistant turn with text + tool blocks.
export function storedMessagesToTurns(stored: AgentStoredMessage[]): ChatTurn[] {
	const turns: ChatTurn[] = [];
	for (const msg of stored) {
		if (msg.role === "user") {
			if (typeof msg.content === "string") {
				turns.push({ role: "user", text: msg.content, id: msg.id });
				continue;
			}
			if (Array.isArray(msg.content)) {
				for (const raw of msg.content as Array<Record<string, unknown>>) {
					if (raw?.type !== "tool_result") continue;
					const id = raw.tool_use_id as string | undefined;
					const isError = raw.is_error === true;
					let parsed: unknown = raw.content;
					if (typeof parsed === "string") {
						try {
							parsed = JSON.parse(parsed);
						} catch {
							/* leave as string */
						}
					}
					for (let i = turns.length - 1; i >= 0; i--) {
						const t = turns[i];
						if (t.role !== "assistant") continue;
						const idx = t.blocks.findIndex((b) => b.type === "tool" && b.id === id);
						if (idx < 0) continue;
						const existing = t.blocks[idx] as Extract<AssistantBlock, { type: "tool" }>;
						t.blocks[idx] = {
							...existing,
							status: isError ? "error" : "ok",
							output: isError ? undefined : parsed,
							errorCode:
								isError && parsed && typeof parsed === "object"
									? ((parsed as { error?: string }).error ?? undefined)
									: undefined,
							errorMessage:
								isError && parsed && typeof parsed === "object"
									? ((parsed as { message?: string }).message ?? undefined)
									: undefined,
						};
						break;
					}
				}
			}
			continue;
		}
		if (msg.role === "assistant") {
			const blocks: AssistantBlock[] = [];
			if (Array.isArray(msg.content)) {
				for (const raw of msg.content as Array<Record<string, unknown>>) {
					if (raw?.type === "text") {
						const text = (raw.text as string) ?? "";
						if (text.trim()) blocks.push({ type: "text", text });
					} else if (raw?.type === "tool_use") {
						blocks.push({
							type: "tool",
							id: (raw.id as string) ?? nextId(),
							name: (raw.name as string) ?? "tool",
							input: (raw.input as Record<string, unknown>) ?? {},
							status: "running",
						});
					}
				}
			}
			turns.push({ role: "assistant", id: msg.id, blocks });
		}
	}
	return turns;
}

export interface UseAgentChatOptions {
	threadId?: string | null;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
	const { threadId } = options;
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<ChatError | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const hydrate = useCallback((next: ChatTurn[]) => {
		setTurns(next);
		setError(null);
	}, []);

	const clear = useCallback(() => {
		setTurns([]);
		setError(null);
	}, []);

	const sendMessage = useCallback(
		async (text: string, overrideThreadId?: string) => {
			if (!text.trim() || streaming) return;

			const userTurn: ChatTurn = { role: "user", text, id: nextId() };
			const assistantTurn: ChatTurn = { role: "assistant", id: nextId(), blocks: [] };
			setTurns((prev) => [...prev, userTurn, assistantTurn]);
			setError(null);
			setStreaming(true);

			const ac = new AbortController();
			abortRef.current = ac;

			try {
				const payload: Record<string, unknown> = { message: text };
				const effectiveThreadId = overrideThreadId ?? threadId;
				if (effectiveThreadId) payload.thread_id = effectiveThreadId;
				const res = await fetch("/api/agent/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json", "X-Requested-With": "terminal" },
					credentials: "include",
					body: JSON.stringify(payload),
					signal: ac.signal,
				});

				if (!res.ok || !res.body) {
					const body = await res.text().catch(() => "");
					throw new Error(`${res.status}: ${body.slice(0, 200) || res.statusText}`);
				}

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buf = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buf += decoder.decode(value, { stream: true });

					// Drain one event at a time.
					while (true) {
						const sep = buf.indexOf("\n\n");
						if (sep === -1) break;
						const raw = buf.slice(0, sep);
						buf = buf.slice(sep + 2);
						const parsed = parseOne(raw);
						if (parsed) applyEvent(setTurns, assistantTurn.id, parsed);
					}
				}
			} catch (e) {
				if ((e as Error).name !== "AbortError") {
					setError({ message: e instanceof Error ? e.message : String(e) });
				}
			} finally {
				setStreaming(false);
				abortRef.current = null;
			}
		},
		[streaming, threadId],
	);

	const stop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const reset = useCallback(() => {
		stop();
		setTurns([]);
		setError(null);
	}, [stop]);

	return { turns, streaming, error, sendMessage, stop, reset, hydrate, clear };
}

function parseOne(raw: string): SSEEvent | null {
	let event = "message";
	let data = "";
	for (const line of raw.split("\n")) {
		if (line.startsWith("event:")) event = line.slice(6).trim();
		else if (line.startsWith("data:")) data += line.slice(5).trim();
	}
	let parsed: unknown = null;
	try {
		parsed = data ? JSON.parse(data) : null;
	} catch {
		parsed = data;
	}
	return { event, data: parsed };
}

function applyEvent(
	setTurns: React.Dispatch<React.SetStateAction<ChatTurn[]>>,
	turnId: string,
	ev: SSEEvent,
) {
	setTurns((prev) =>
		prev.map((t) => {
			if (t.role !== "assistant" || t.id !== turnId) return t;
			const blocks = [...t.blocks];
			switch (ev.event) {
				case "message": {
					const text = (ev.data as { text?: string })?.text ?? "";
					blocks.push({ type: "text", text });
					break;
				}
				case "tool_call": {
					const d = ev.data as { id: string; name: string; input: Record<string, unknown> };
					blocks.push({ type: "tool", id: d.id, name: d.name, input: d.input, status: "running" });
					break;
				}
				case "tool_result": {
					const d = ev.data as {
						id: string;
						name: string;
						ok: boolean;
						data?: unknown;
						error?: string;
						message?: string;
					};
					const idx = blocks.findIndex((b) => b.type === "tool" && b.id === d.id);
					if (idx >= 0) {
						const existing = blocks[idx] as Extract<AssistantBlock, { type: "tool" }>;
						blocks[idx] = {
							...existing,
							status: d.ok ? "ok" : "error",
							output: d.ok ? d.data : undefined,
							errorCode: d.ok ? undefined : d.error,
							errorMessage: d.ok ? undefined : d.message,
						};
					}
					break;
				}
				case "usage": {
					const d = ev.data as { provider?: string };
					return { ...t, blocks, provider: d.provider ?? t.provider };
				}
				case "error": {
					const d = ev.data as { message?: string };
					blocks.push({ type: "text", text: `⚠ ${d.message ?? "error"}` });
					break;
				}
			}
			return { ...t, blocks };
		}),
	);
}
