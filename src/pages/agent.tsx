import { Send, Square } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TierGate } from "../components/auth/tier-gate";
import { type AssistantBlock, type ChatTurn, useAgentChat } from "../hooks/use-agent-chat";

const SUGGESTIONS = [
	"Quote BBCA and BBRI, compare today's move",
	"What's my paper portfolio doing?",
	"Screen for oversold banks trading below book value",
	"Who are the top foreign buyers this week?",
];

export function AgentPage() {
	return (
		<TierGate minTier="starter" featureName="Research Agent">
			<AgentChat />
		</TierGate>
	);
}

function AgentChat() {
	const { turns, streaming, error, sendMessage, stop, reset } = useAgentChat();
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when turns change
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [turns]);

	function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const text = input.trim();
		if (!text) return;
		setInput("");
		void sendMessage(text);
	}

	return (
		<div className="flex h-[calc(100vh-10rem)] flex-col">
			<div className="flex shrink-0 items-center justify-between border-b border-rule bg-card px-4 py-3">
				<div>
					<div className="flex items-center gap-3">
						<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
							Research Agent
						</span>
						<span className="h-px w-12 bg-ember-400/40" />
					</div>
					<h1
						className="mt-1 text-xl leading-tight text-ink"
						style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
					>
						Ask <em className="text-ember-600">anything</em> about IDX
					</h1>
				</div>
				{turns.length > 0 && (
					<button
						type="button"
						onClick={reset}
						className="rounded-full border border-rule bg-card px-3 py-1 font-mono text-xs text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
					>
						New chat
					</button>
				)}
			</div>

			<div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
				{turns.length === 0 && <Welcome onPick={(s) => setInput(s)} />}
				{turns.map((turn) => (
					<Turn key={turn.id} turn={turn} />
				))}
				{error && (
					<div className="rounded-[12px] border border-neg/30 bg-neg/10 p-3 font-mono text-xs text-neg">
						{error.message}
					</div>
				)}
			</div>

			<form
				onSubmit={onSubmit}
				className="shrink-0 border-t border-rule bg-card p-3 sm:p-4"
			>
				<div className="flex items-end gap-2">
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								const text = input.trim();
								if (text) {
									setInput("");
									void sendMessage(text);
								}
							}
						}}
						placeholder="Ask about IDX stocks, portfolio, or place a paper order…"
						rows={2}
						className="min-h-[48px] flex-1 resize-none rounded-[12px] border border-rule bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/15"
						disabled={streaming}
					/>
					{streaming ? (
						<button
							type="button"
							onClick={stop}
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neg/30 bg-neg/10 text-neg transition-colors hover:bg-neg/15"
							title="Stop"
						>
							<Square className="h-4 w-4" />
						</button>
					) : (
						<button
							type="submit"
							disabled={!input.trim()}
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ember-500 text-paper transition-colors hover:bg-ember-600 disabled:opacity-30"
							title="Send"
						>
							<Send className="h-4 w-4" />
						</button>
					)}
				</div>
				<p className="mt-2 font-mono text-[10px] text-ink-4">
					Paper trading only. Not financial advice. IDX data (957 companies).
				</p>
			</form>
		</div>
	);
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
	return (
		<div className="mx-auto max-w-2xl py-8 sm:py-12">
			<h2
				className="text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] text-ink"
				style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
			>
				Ask the <em className="text-ember-600">agent</em> anything about IDX.
			</h2>
			<p className="mt-3 font-mono text-sm text-ink-3">
				It can pull quotes, financials, broker flow, insider moves, disclosures, and place paper
				orders on your behalf.
			</p>
			<div className="mt-6 grid gap-2 sm:grid-cols-2">
				{SUGGESTIONS.map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => onPick(s)}
						className="rounded-[12px] border border-rule bg-card p-3 text-left font-mono text-sm text-ink-2 transition-colors hover:border-ember-400/40 hover:bg-ember-50/60"
					>
						{s}
					</button>
				))}
			</div>
		</div>
	);
}

function Turn({ turn }: { turn: ChatTurn }) {
	if (turn.role === "user") {
		return (
			<div className="flex justify-end">
				<div className="max-w-[85%] rounded-[14px] border border-ember-400/30 bg-ember-50 px-3 py-2 font-mono text-sm text-ember-700">
					{turn.text}
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-[90%] space-y-2">
			{turn.blocks.length === 0 && (
				<div className="flex items-center gap-2 font-mono text-xs text-ink-4">
					<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ember-500" />
					<span>Thinking…</span>
				</div>
			)}
			{turn.blocks.map((block, i) => (
				<Block key={i} block={block} />
			))}
			{turn.provider && (
				<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
					via {turn.provider}
				</div>
			)}
		</div>
	);
}

function Block({ block }: { block: AssistantBlock }) {
	if (block.type === "text") {
		return (
			<div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{block.text}</div>
		);
	}

	const dotClass =
		block.status === "ok"
			? "bg-pos"
			: block.status === "error"
				? "bg-neg"
				: "animate-pulse bg-ember-500";

	return (
		<details className="rounded-[12px] border border-rule bg-paper-2/60 px-3 py-2 text-xs">
			<summary className="flex cursor-pointer list-none items-center gap-2 text-ink-2">
				<span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
				<span className="font-mono">{block.name}</span>
				<span className="text-ink-4">
					{block.status === "running"
						? "running…"
						: block.status === "ok"
							? "ok"
							: `error: ${block.errorCode ?? "?"}`}
				</span>
			</summary>
			<div className="mt-2 space-y-2">
				<div>
					<div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
						input
					</div>
					<pre className="overflow-x-auto rounded-[8px] border border-rule bg-card p-2 text-[11px] text-ink-2">
						{JSON.stringify(block.input, null, 2)}
					</pre>
				</div>
				{block.status === "ok" && (
					<div>
						<div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
							output
						</div>
						<pre className="max-h-64 overflow-auto rounded-[8px] border border-rule bg-card p-2 text-[11px] text-ink-2">
							{JSON.stringify(block.output, null, 2)}
						</pre>
					</div>
				)}
				{block.status === "error" && (
					<div className="font-mono text-neg">{block.errorMessage ?? "(no message)"}</div>
				)}
			</div>
		</details>
	);
}
