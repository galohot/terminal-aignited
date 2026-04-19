import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Send, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth";
import { research, type ResearchArticle, type ResearchType } from "../lib/api";

const FOUNDER_EMAILS = new Set([
	"irwndedi@gmail.com",
	"rivsyah@gmail.com",
	"biroumumkemlu@gmail.com",
]);

const TYPE_OPTIONS: ResearchType[] = [
	"am_brief",
	"deep_dive",
	"sector",
	"earnings_preview",
	"earnings_recap",
	"power_map",
	"macro",
];

export function AdminResearchPage() {
	const { state } = useAuth();
	const isFounder =
		state.status === "auth" && FOUNDER_EMAILS.has(state.user.email.toLowerCase());

	const draftsQ = useQuery({
		queryKey: ["admin", "research", "drafts"],
		queryFn: () => research.adminDrafts(),
		enabled: isFounder,
		staleTime: 30_000,
	});

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const items = draftsQ.data?.items ?? [];
	const selected = items.find((a) => a.id === selectedId) ?? items[0] ?? null;

	if (state.status === "loading") {
		return <CenterMsg msg="Loading…" />;
	}
	if (!isFounder) {
		return <CenterMsg msg="Founder access only." />;
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
			<header className="mb-6 flex items-end justify-between gap-4 border-b border-rule pb-5">
				<div>
					<div className="font-mono text-[11px] text-ember-600 uppercase tracking-[0.28em]">
						Admin · Research Review
					</div>
					<h1
						className="mt-2 font-extrabold text-[26px] text-ink leading-tight tracking-[-0.015em] sm:text-[32px]"
						style={{ fontFamily: "var(--font-display)" }}
					>
						Draft Queue
					</h1>
					<p className="mt-1 text-[13px] text-ink-3">
						{items.length === 0
							? "No drafts pending — generator hasn't run yet or all reviewed."
							: `${items.length} draft${items.length === 1 ? "" : "s"} awaiting review.`}
					</p>
				</div>
				<GenerateNowButton onDone={() => draftsQ.refetch()} />
			</header>

			{draftsQ.isLoading && <CenterMsg msg="Loading drafts…" />}

			{items.length > 0 && (
				<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
					<aside className="space-y-1.5">
						{items.map((a) => (
							<button
								key={a.id}
								type="button"
								onClick={() => setSelectedId(a.id)}
								className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
									(selected?.id ?? null) === a.id
										? "border-ink bg-card"
										: "border-rule bg-paper-2 hover:bg-card"
								}`}
							>
								<div className="font-mono text-[10px] text-ember-600 tracking-[0.18em] uppercase">
									{a.type.replace(/_/g, " ")} · {a.status}
								</div>
								<div className="mt-1 line-clamp-2 font-semibold text-[13px] text-ink">
									{a.title}
								</div>
								<div className="mt-1 font-mono text-[10px] text-ink-4 tracking-[0.1em]">
									{new Date(a.created_at).toLocaleString("en-GB", {
										day: "2-digit",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</button>
						))}
					</aside>

					{selected && <Editor key={selected.id} draft={selected} />}
				</div>
			)}
		</div>
	);
}

function Editor({ draft }: { draft: ResearchArticle }) {
	const qc = useQueryClient();
	const [title, setTitle] = useState(draft.title);
	const [summary, setSummary] = useState(draft.summary);
	const [body, setBody] = useState(draft.body_md);
	const [tickers, setTickers] = useState(draft.tickers.join(", "));
	const [tags, setTags] = useState(draft.tags.join(", "));
	const [tier, setTier] = useState(draft.required_tier);
	const [type, setType] = useState<ResearchType>(draft.type);

	useEffect(() => {
		setTitle(draft.title);
		setSummary(draft.summary);
		setBody(draft.body_md);
		setTickers(draft.tickers.join(", "));
		setTags(draft.tags.join(", "));
		setTier(draft.required_tier);
		setType(draft.type);
	}, [draft]);

	const save = useMutation({
		mutationFn: () =>
			research.adminUpsert({
				slug: draft.slug,
				type,
				title,
				summary,
				body_md: body,
				tickers: csvUpper(tickers),
				tags: csvLower(tags),
				sectors: draft.sectors,
				required_tier: tier,
				status: "reviewed",
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "research", "drafts"] }),
	});

	const publish = useMutation({
		mutationFn: async () => {
			await research.adminUpsert({
				slug: draft.slug,
				type,
				title,
				summary,
				body_md: body,
				tickers: csvUpper(tickers),
				tags: csvLower(tags),
				sectors: draft.sectors,
				required_tier: tier,
				status: "reviewed",
			});
			return research.adminPublish(draft.id);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "research", "drafts"] }),
	});

	return (
		<section className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-3">
				<Field label="Type">
					<select
						value={type}
						onChange={(e) => setType(e.target.value as ResearchType)}
						className="w-full rounded-md border border-rule bg-paper-2 px-2 py-1.5 font-mono text-[12px]"
					>
						{TYPE_OPTIONS.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</Field>
				<Field label="Tier">
					<select
						value={tier}
						onChange={(e) => setTier(e.target.value as "starter" | "pro" | "institutional")}
						className="w-full rounded-md border border-rule bg-paper-2 px-2 py-1.5 font-mono text-[12px]"
					>
						<option value="starter">starter</option>
						<option value="pro">pro</option>
						<option value="institutional">institutional</option>
					</select>
				</Field>
				<Field label="Slug">
					<input
						value={draft.slug}
						readOnly
						className="w-full rounded-md border border-rule bg-paper-2 px-2 py-1.5 font-mono text-[11px] text-ink-3"
					/>
				</Field>
			</div>

			<Field label="Title">
				<input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-semibold text-[15px]"
				/>
			</Field>

			<Field label="Summary (paywall teaser)">
				<textarea
					value={summary}
					onChange={(e) => setSummary(e.target.value)}
					rows={2}
					className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[13px]"
				/>
			</Field>

			<Field label="Body (markdown)">
				<textarea
					value={body}
					onChange={(e) => setBody(e.target.value)}
					rows={18}
					className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-[13px] leading-relaxed"
				/>
			</Field>

			<div className="grid gap-3 sm:grid-cols-2">
				<Field label="Tickers (comma-separated)">
					<input
						value={tickers}
						onChange={(e) => setTickers(e.target.value)}
						className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-[12px]"
					/>
				</Field>
				<Field label="Tags (comma-separated)">
					<input
						value={tags}
						onChange={(e) => setTags(e.target.value)}
						className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-[12px]"
					/>
				</Field>
			</div>

			<div className="flex flex-wrap items-center gap-2 pt-2">
				<button
					type="button"
					onClick={() => save.mutate()}
					disabled={save.isPending}
					className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-paper-2 px-3.5 py-2 font-mono text-[11px] tracking-[0.18em] uppercase hover:bg-card disabled:opacity-50"
				>
					{save.isPending ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Pencil className="h-3.5 w-3.5" />
					)}
					Save draft
				</button>
				<button
					type="button"
					onClick={() => publish.mutate()}
					disabled={publish.isPending}
					className="inline-flex items-center gap-1.5 rounded-md bg-ember-500 px-3.5 py-2 font-mono text-[11px] text-white tracking-[0.18em] uppercase hover:bg-ember-600 disabled:opacity-50"
				>
					{publish.isPending ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Send className="h-3.5 w-3.5" />
					)}
					Publish
				</button>
				{save.isSuccess && !save.isPending && (
					<span className="inline-flex items-center gap-1 font-mono text-[11px] text-pos">
						<Check className="h-3 w-3" /> saved
					</span>
				)}
				{publish.isSuccess && !publish.isPending && (
					<span className="inline-flex items-center gap-1 font-mono text-[11px] text-pos">
						<Check className="h-3 w-3" /> published
					</span>
				)}
			</div>
		</section>
	);
}

function GenerateNowButton({ onDone }: { onDone: () => void }) {
	const gen = useMutation({
		mutationFn: () => research.adminGenerateAmBrief(),
		onSuccess: () => onDone(),
	});
	return (
		<div className="flex flex-col items-end gap-1">
			<button
				type="button"
				onClick={() => gen.mutate()}
				disabled={gen.isPending}
				className="inline-flex items-center gap-1.5 rounded-md border border-ember-500/40 bg-ember-50 px-3.5 py-2 font-mono text-[11px] text-ember-700 tracking-[0.18em] uppercase hover:bg-ember-100 disabled:opacity-50"
			>
				{gen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
				Generate AM Brief
			</button>
			{gen.data && !gen.data.ok && (
				<span className="font-mono text-[10px] text-neg">{gen.data.error}</span>
			)}
			{gen.data?.ok && (
				<span className="font-mono text-[10px] text-pos">Draft created: {gen.data.slug}</span>
			)}
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block">
			<span className="mb-1 block font-mono text-[10px] text-ink-4 uppercase tracking-[0.18em]">
				{label}
			</span>
			{children}
		</label>
	);
}

function CenterMsg({ msg }: { msg: string }) {
	return (
		<div className="mx-auto max-w-3xl px-4 py-24 text-center font-mono text-sm text-ink-3">
			{msg}
		</div>
	);
}

function csvUpper(s: string): string[] {
	return s
		.split(",")
		.map((x) => x.trim().toUpperCase())
		.filter(Boolean);
}

function csvLower(s: string): string[] {
	return s
		.split(",")
		.map((x) => x.trim().toLowerCase())
		.filter(Boolean);
}
