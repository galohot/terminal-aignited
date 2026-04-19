import { BookOpen, Lock, MessageSquarePlus, Pencil, Send, Square, Trash2 } from "lucide-react";
import {
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link } from "react-router";
import { TierGate } from "../components/auth/tier-gate";
import { useHasTier } from "../contexts/auth";
import {
	type AssistantBlock,
	type ChatTurn,
	type Citation,
	extractCitations,
	storedMessagesToTurns,
	useAgentChat,
} from "../hooks/use-agent-chat";
import { type AgentPersona, type AgentThread, agent as agentApi } from "../lib/api";

const SUGGESTIONS = [
	"Quote BBCA and BBRI, compare today's move",
	"What's my paper portfolio doing?",
	"Screen for oversold banks trading below book value",
	"Who are the top foreign buyers this week?",
];

export function AgentPage() {
	return (
		<TierGate minTier="starter" featureName="Research Agent">
			<AgentShell />
		</TierGate>
	);
}

function AgentShell() {
	const canThread = useHasTier("pro");
	return canThread ? <ThreadedAgent /> : <EphemeralAgent />;
}

// ----- Threaded agent (Pro+) ---------------------------------------------

function ThreadedAgent() {
	const [threads, setThreads] = useState<AgentThread[]>([]);
	const [personas, setPersonas] = useState<AgentPersona[]>([]);
	const [activeThread, setActiveThread] = useState<AgentThread | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	// Chat owns turns; parent forwards hydrate/clear via a ref-held callback.
	const chatControllerRef = useRef<{ hydrate: (t: ChatTurn[]) => void; clear: () => void } | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [t, p] = await Promise.all([agentApi.listThreads(), agentApi.listPersonas()]);
				if (cancelled) return;
				setThreads(t.threads);
				setPersonas(p.personas);
			} catch (e) {
				if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const selectThread = useCallback(async (thread: AgentThread) => {
		setActiveThread(thread);
		chatControllerRef.current?.clear();
		try {
			const { messages } = await agentApi.getThread(thread.id);
			chatControllerRef.current?.hydrate(storedMessagesToTurns(messages));
		} catch (e) {
			setLoadError(e instanceof Error ? e.message : "Failed to load thread");
		}
	}, []);

	const newChat = useCallback(() => {
		setActiveThread(null);
		chatControllerRef.current?.clear();
	}, []);

	const ensureThread = useCallback(
		async (firstMessage: string, personaId: string | null): Promise<AgentThread> => {
			if (activeThread) return activeThread;
			const derived = firstMessage.trim().replace(/\s+/g, " ");
			const title = derived.length <= 50 ? derived || "New chat" : `${derived.slice(0, 47)}…`;
			const { thread } = await agentApi.createThread({ title, personaId });
			setThreads((prev) => [thread, ...prev]);
			setActiveThread(thread);
			return thread;
		},
		[activeThread],
	);

	const onThreadUpdated = useCallback((thread: AgentThread) => {
		setActiveThread(thread);
		setThreads((prev) => prev.map((t) => (t.id === thread.id ? thread : t)));
	}, []);

	const onThreadDeleted = useCallback(
		(id: string) => {
			setThreads((prev) => prev.filter((t) => t.id !== id));
			if (activeThread?.id === id) {
				setActiveThread(null);
				chatControllerRef.current?.clear();
			}
		},
		[activeThread],
	);

	return (
		<div className="flex h-[calc(100vh-8rem)]">
			<ThreadSidebar
				threads={threads}
				activeId={activeThread?.id ?? null}
				onSelect={selectThread}
				onNew={newChat}
				onDelete={async (id) => {
					try {
						await agentApi.deleteThread(id);
						onThreadDeleted(id);
					} catch (e) {
						setLoadError(e instanceof Error ? e.message : "Delete failed");
					}
				}}
				onRename={async (id, title) => {
					try {
						const { thread } = await agentApi.updateThread(id, { title });
						onThreadUpdated(thread);
					} catch (e) {
						setLoadError(e instanceof Error ? e.message : "Rename failed");
					}
				}}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<ChatPane
					thread={activeThread}
					personas={personas}
					controllerRef={chatControllerRef}
					ensureThread={ensureThread}
					onPersonaChange={async (personaId) => {
						if (!activeThread) return;
						try {
							const { thread } = await agentApi.updateThread(activeThread.id, { personaId });
							onThreadUpdated(thread);
						} catch (e) {
							setLoadError(e instanceof Error ? e.message : "Persona update failed");
						}
					}}
				/>
				{loadError && (
					<div className="border-t border-neg/30 bg-neg/10 px-4 py-2 font-mono text-xs text-neg">
						{loadError}
					</div>
				)}
			</div>
		</div>
	);
}

function ThreadSidebar({
	threads,
	activeId,
	onSelect,
	onNew,
	onDelete,
	onRename,
}: {
	threads: AgentThread[];
	activeId: string | null;
	onSelect: (t: AgentThread) => void;
	onNew: () => void;
	onDelete: (id: string) => void;
	onRename: (id: string, title: string) => void;
}) {
	return (
		<aside className="hidden w-64 shrink-0 flex-col border-r border-rule bg-paper-2/40 md:flex">
			<div className="border-b border-rule p-3">
				<button
					type="button"
					onClick={onNew}
					className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-ember-400/40 bg-ember-500 px-3 py-2 font-mono text-xs text-paper transition-colors hover:bg-ember-600"
				>
					<MessageSquarePlus className="h-3.5 w-3.5" />
					New chat
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-2">
				{threads.length === 0 && (
					<div className="px-2 py-4 font-mono text-[11px] leading-relaxed text-ink-4">
						No threads yet. Start a new chat — it's saved automatically.
					</div>
				)}
				{threads.map((t) => (
					<ThreadRow
						key={t.id}
						thread={t}
						active={t.id === activeId}
						onClick={() => onSelect(t)}
						onDelete={() => onDelete(t.id)}
						onRename={(title) => onRename(t.id, title)}
					/>
				))}
			</div>
		</aside>
	);
}

function ThreadRow({
	thread,
	active,
	onClick,
	onDelete,
	onRename,
}: {
	thread: AgentThread;
	active: boolean;
	onClick: () => void;
	onDelete: () => void;
	onRename: (title: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(thread.title);

	if (editing) {
		return (
			<form
				onSubmit={(e) => {
					e.preventDefault();
					const trimmed = draft.trim();
					if (trimmed && trimmed !== thread.title) onRename(trimmed);
					setEditing(false);
				}}
				className="px-2 py-1"
			>
				<input
					// biome-ignore lint/a11y/noAutofocus: rename field only shown on deliberate user action
					autoFocus
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={() => setEditing(false)}
					className="w-full rounded-[8px] border border-ember-400/40 bg-card px-2 py-1 font-mono text-xs text-ink focus:outline-none"
				/>
			</form>
		);
	}

	return (
		<div
			className={`group flex items-center gap-1 rounded-[8px] px-2 py-1.5 text-sm ${
				active ? "bg-ember-50" : "hover:bg-paper-2"
			}`}
		>
			<button
				type="button"
				onClick={onClick}
				className={`flex-1 truncate text-left font-mono text-xs ${
					active ? "text-ember-700" : "text-ink-2"
				}`}
				title={thread.title}
			>
				{thread.title}
			</button>
			<button
				type="button"
				onClick={() => {
					setDraft(thread.title);
					setEditing(true);
				}}
				className="hidden text-ink-4 transition-colors hover:text-ink group-hover:block"
				title="Rename"
			>
				<Pencil className="h-3 w-3" />
			</button>
			<button
				type="button"
				onClick={() => {
					if (confirm(`Delete "${thread.title}"?`)) onDelete();
				}}
				className="hidden text-ink-4 transition-colors hover:text-neg group-hover:block"
				title="Delete"
			>
				<Trash2 className="h-3 w-3" />
			</button>
		</div>
	);
}

function ChatPane({
	thread,
	personas,
	controllerRef,
	ensureThread,
	onPersonaChange,
}: {
	thread: AgentThread | null;
	personas: AgentPersona[];
	controllerRef: React.MutableRefObject<{
		hydrate: (t: ChatTurn[]) => void;
		clear: () => void;
	} | null>;
	ensureThread: (firstMessage: string, personaId: string | null) => Promise<AgentThread>;
	onPersonaChange: (personaId: string | null) => void;
}) {
	const [pendingPersonaId, setPendingPersonaId] = useState<string | null>(null);
	const threadId = thread?.id ?? null;
	const { turns, streaming, error, sendMessage, stop, hydrate, clear } = useAgentChat({
		threadId,
	});
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	// Publish this pane's hydrate/clear so the parent can drive resets on thread switch.
	useEffect(() => {
		controllerRef.current = { hydrate, clear };
		return () => {
			controllerRef.current = null;
		};
	}, [controllerRef, hydrate, clear]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new turns
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [turns.length]);

	const personaId = thread?.persona_id ?? pendingPersonaId;
	const activePersona = useMemo(
		() => personas.find((p) => p.id === personaId) ?? null,
		[personas, personaId],
	);
	const citations = useMemo(() => extractCitations(turns), [turns]);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const text = input.trim();
		if (!text) return;
		setInput("");
		let effectiveId = thread?.id;
		if (!effectiveId) {
			try {
				const t = await ensureThread(text, pendingPersonaId);
				effectiveId = t.id;
			} catch {
				return;
			}
		}
		void sendMessage(text, effectiveId);
	}

	return (
		<div className="flex h-full min-w-0 flex-col">
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-card px-4 py-3">
				<div className="min-w-0">
					<div className="flex items-center gap-3">
						<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
							Research Agent
						</span>
						<span className="h-px w-12 bg-ember-400/40" />
					</div>
					<h1
						className="mt-1 truncate text-xl leading-tight text-ink"
						style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
						title={thread?.title ?? "New chat"}
					>
						{thread?.title ?? "New chat"}
					</h1>
				</div>
				<PersonaPicker
					personas={personas}
					active={activePersona}
					onChange={(id) => {
						if (thread) onPersonaChange(id);
						else setPendingPersonaId(id);
					}}
				/>
			</div>

			<div className="flex min-h-0 flex-1">
				<div className="flex min-w-0 flex-1 flex-col">
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

					<Composer
						value={input}
						onChange={setInput}
						onSubmit={onSubmit}
						streaming={streaming}
						onStop={stop}
					/>
				</div>
				<CitationsSidebar citations={citations} />
			</div>
		</div>
	);
}

function PersonaPicker({
	personas,
	active,
	onChange,
}: {
	personas: AgentPersona[];
	active: AgentPersona | null;
	onChange: (id: string | null) => void;
}) {
	return (
		<div className="flex shrink-0 items-center gap-2">
			<label
				htmlFor="persona-picker"
				className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4"
			>
				Persona
			</label>
			<select
				id="persona-picker"
				value={active?.id ?? ""}
				onChange={(e) => onChange(e.target.value || null)}
				className="rounded-[8px] border border-rule bg-card px-2 py-1 font-mono text-xs text-ink focus:border-ember-400 focus:outline-none"
				title={active?.description}
			>
				<option value="">Generalist</option>
				{personas
					.filter((p) => p.id !== "default")
					.map((p) => (
						<option key={p.id} value={p.id} title={p.description}>
							{p.name}
						</option>
					))}
			</select>
		</div>
	);
}

// ----- Ephemeral agent (Starter or unauthed) ------------------------------

function EphemeralAgent() {
	const { turns, streaming, error, sendMessage, stop, reset } = useAgentChat();
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);
	const citations = useMemo(() => extractCitations(turns), [turns]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new turns
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [turns.length]);

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
					<p className="mt-1 font-mono text-[10px] text-ink-4">
						Upgrade to Pro for saved threads + persona presets.
					</p>
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

			<div className="flex min-h-0 flex-1">
				<div className="flex min-w-0 flex-1 flex-col">
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

					<Composer
						value={input}
						onChange={setInput}
						onSubmit={onSubmit}
						streaming={streaming}
						onStop={stop}
					/>
				</div>
				<CitationsSidebar citations={citations} />
			</div>
		</div>
	);
}

// ----- Shared: Composer + Welcome + Turn + Block --------------------------

function Composer({
	value,
	onChange,
	onSubmit,
	streaming,
	onStop,
}: {
	value: string;
	onChange: (s: string) => void;
	onSubmit: (e: FormEvent<HTMLFormElement>) => void;
	streaming: boolean;
	onStop: () => void;
}) {
	return (
		<form onSubmit={onSubmit} className="shrink-0 border-t border-rule bg-card p-3 sm:p-4">
			<div className="flex items-end gap-2">
				<textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							const form = e.currentTarget.form;
							form?.requestSubmit();
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
						onClick={onStop}
						className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neg/30 bg-neg/10 text-neg transition-colors hover:bg-neg/15"
						title="Stop"
					>
						<Square className="h-4 w-4" />
					</button>
				) : (
					<button
						type="submit"
						disabled={!value.trim()}
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
				<Block key={block.type === "tool" ? block.id : `text-${i}`} block={block} />
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
			<div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
				{renderWithResearchLinks(block.text)}
			</div>
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

// ----- Citations sidebar --------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
	am_brief: "AM Brief",
	deep_dive: "Deep Dive",
	sector: "Sector",
	earnings_preview: "Earnings Preview",
	earnings_recap: "Earnings Recap",
	power_map: "Power Map",
	macro: "Macro",
};

function CitationsSidebar({ citations }: { citations: Citation[] }) {
	return (
		<aside className="hidden w-72 shrink-0 flex-col border-l border-rule bg-paper-2/40 lg:flex">
			<div className="flex items-center gap-2 border-b border-rule px-4 py-3">
				<BookOpen className="h-3.5 w-3.5 text-ember-600" />
				<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
					Citations
				</span>
				{citations.length > 0 && (
					<span className="ml-auto font-mono text-[10px] text-ink-4">{citations.length}</span>
				)}
			</div>
			<div className="flex-1 space-y-3 overflow-y-auto p-3">
				{citations.length === 0 ? (
					<p className="font-mono text-[11px] leading-relaxed text-ink-4">
						AIgnited Research articles the agent pulls will appear here. Ask about a ticker, sector,
						or macro view to trigger a search.
					</p>
				) : (
					citations.map((c) => <CitationCard key={c.slug} citation={c} />)
				)}
			</div>
		</aside>
	);
}

function CitationCard({ citation }: { citation: Citation }) {
	const label = TYPE_LABEL[citation.type] ?? citation.type;
	return (
		<Link
			to={`/research/${citation.slug}`}
			className="block rounded-[10px] border border-rule bg-card p-3 transition-colors hover:border-ember-400/40 hover:bg-ember-50/60"
		>
			<div className="flex items-center gap-2">
				<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ember-600">
					{label}
				</span>
				{citation.gated && (
					<span
						className="inline-flex items-center gap-0.5 rounded-full border border-rule bg-paper-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-4"
						title={`Requires ${citation.required_tier}`}
					>
						<Lock className="h-2.5 w-2.5" />
						{citation.required_tier}
					</span>
				)}
			</div>
			<div className="mt-1 line-clamp-2 text-sm leading-snug text-ink">{citation.title}</div>
			{citation.summary && (
				<div className="mt-1 line-clamp-2 font-mono text-[10px] leading-relaxed text-ink-3">
					{citation.summary}
				</div>
			)}
			{(citation.tickers.length > 0 || citation.sectors.length > 0) && (
				<div className="mt-2 flex flex-wrap gap-1">
					{citation.tickers.slice(0, 4).map((t) => (
						<span
							key={`t-${t}`}
							className="rounded-full bg-ember-50 px-1.5 py-0.5 font-mono text-[9px] text-ember-700"
						>
							{t}
						</span>
					))}
					{citation.sectors.slice(0, 2).map((s) => (
						<span
							key={`s-${s}`}
							className="rounded-full bg-paper-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3"
						>
							{s}
						</span>
					))}
				</div>
			)}
		</Link>
	);
}

const RESEARCH_LINK_RE = /\/research\/([a-z0-9][a-z0-9-]*)/gi;

function renderWithResearchLinks(text: string): ReactNode[] {
	const out: ReactNode[] = [];
	let lastIdx = 0;
	let match: RegExpExecArray | null;
	RESEARCH_LINK_RE.lastIndex = 0;
	match = RESEARCH_LINK_RE.exec(text);
	while (match !== null) {
		if (match.index > lastIdx) out.push(text.slice(lastIdx, match.index));
		const slug = match[1];
		out.push(
			<Link
				key={`${slug}-${match.index}`}
				to={`/research/${slug}`}
				className="font-mono text-ember-600 underline decoration-ember-400/40 underline-offset-2 hover:decoration-ember-600"
			>
				/research/{slug}
			</Link>,
		);
		lastIdx = match.index + match[0].length;
		match = RESEARCH_LINK_RE.exec(text);
	}
	if (lastIdx < text.length) out.push(text.slice(lastIdx));
	return out.length > 0 ? out : [text];
}
