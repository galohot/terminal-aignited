import { useCallback, useRef, useState } from "react";

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

type ChatError = { message: string };

interface SSEEvent {
	event: string;
	data: unknown;
}

// Parse `event: xxx\ndata: {...}\n\n` into events as they arrive.
function* parseSSE(buffer: string): Generator<{ events: SSEEvent[]; rest: string }> {
	let rest = buffer;
	while (true) {
		const sep = rest.indexOf("\n\n");
		if (sep === -1) {
			yield { events: [], rest };
			return;
		}
		const raw = rest.slice(0, sep);
		rest = rest.slice(sep + 2);
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
		yield { events: [{ event, data: parsed }], rest };
	}
}

function nextId(): string {
	return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgentChat() {
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<ChatError | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const sendMessage = useCallback(
		async (text: string) => {
			if (!text.trim() || streaming) return;

			const userTurn: ChatTurn = { role: "user", text, id: nextId() };
			const assistantTurn: ChatTurn = { role: "assistant", id: nextId(), blocks: [] };
			setTurns((prev) => [...prev, userTurn, assistantTurn]);
			setError(null);
			setStreaming(true);

			const ac = new AbortController();
			abortRef.current = ac;

			try {
				const res = await fetch("/api/agent/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ message: text }),
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
		[streaming],
	);

	const stop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const reset = useCallback(() => {
		stop();
		setTurns([]);
		setError(null);
	}, [stop]);

	return { turns, streaming, error, sendMessage, stop, reset };
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
