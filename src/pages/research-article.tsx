import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Newspaper } from "lucide-react";
import { Link, useParams } from "react-router";
import { loginWithGoogle, useAuth } from "../contexts/auth";
import { research } from "../lib/api";

export function ResearchArticlePage() {
	const { slug } = useParams<{ slug: string }>();
	const { state } = useAuth();

	const articleQ = useQuery({
		queryKey: ["research", "article", slug],
		queryFn: () => research.get(slug!),
		enabled: !!slug,
		staleTime: 60_000,
		retry: false,
	});

	if (articleQ.isLoading) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-24 text-center font-mono text-sm text-ink-4">
				Loading article…
			</div>
		);
	}

	if (articleQ.isError || !articleQ.data) {
		return (
			<div className="mx-auto max-w-3xl px-4 py-24 text-center">
				<p className="font-mono text-sm text-ink-3">Article not found.</p>
				<Link to="/research" className="mt-4 inline-block text-ember-600 hover:text-ember-700">
					← Back to research
				</Link>
			</div>
		);
	}

	const { article, gated } = articleQ.data;
	const authed = state.status === "auth";

	return (
		<div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
			<Link
				to="/research"
				className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-4 tracking-[0.18em] uppercase hover:text-ink-2"
			>
				<ArrowLeft className="h-3.5 w-3.5" /> Research
			</Link>

			<div className="mt-6 border-b border-rule pb-6">
				<div className="flex items-center gap-2 font-mono text-[11px] text-ember-600 uppercase tracking-[0.22em]">
					<Newspaper className="h-3.5 w-3.5" />
					{formatType(article.type)}
					<span className="text-ink-4">·</span>
					<span className="text-ink-4">{formatDate(article.published_at)}</span>
				</div>
				<h1
					className="mt-3 font-extrabold text-[30px] text-ink leading-tight tracking-[-0.015em] sm:text-[38px]"
					style={{ fontFamily: "var(--font-display)" }}
				>
					{article.title}
				</h1>
				<p className="mt-3 text-[16px] text-ink-2 leading-relaxed">{article.summary}</p>
				{article.tickers.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-1.5">
						{article.tickers.map((t) => (
							<Link
								key={t}
								to={`/stock/${t}`}
								className="rounded-md bg-paper-2 px-2 py-0.5 font-mono text-[11px] text-ink-2 tracking-[0.08em] hover:bg-card hover:text-ink"
							>
								{t}
							</Link>
						))}
					</div>
				)}
			</div>

			<article className="prose-terminal mt-8">
				<MarkdownBody md={article.body_md} />
			</article>

			{gated && (
				<div className="mt-10 rounded-[18px] border border-ember-500/25 bg-gradient-to-b from-ember-50/40 to-card p-6 sm:p-8">
					<div className="flex items-center gap-2 font-mono text-[11px] text-ember-700 uppercase tracking-[0.22em]">
						<Lock className="h-3.5 w-3.5" />
						{article.required_tier === "institutional" ? "Institutional" : "Pro"} only
					</div>
					<h3
						className="mt-2 font-extrabold text-[22px] text-ink tracking-[-0.01em]"
						style={{ fontFamily: "var(--font-display)" }}
					>
						Keep reading with AIgnited {article.required_tier === "institutional" ? "Institutional" : "Pro"}
					</h3>
					<p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
						Daily AM briefs, company deep-dives, sector reports, and earnings coverage — delivered
						to the terminal, your inbox, and Telegram.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						{authed ? (
							<Link
								to="/pricing"
								className="inline-flex items-center rounded-full bg-ember-500 px-5 py-2.5 font-mono text-[11px] text-white tracking-[0.22em] uppercase shadow-[0_1px_2px_rgba(232,78,0,0.3)] transition-transform hover:-translate-y-[1px] hover:bg-ember-600"
							>
								See plans
							</Link>
						) : (
							<button
								type="button"
								onClick={loginWithGoogle}
								className="inline-flex items-center rounded-full bg-ink px-5 py-2.5 font-mono text-[11px] text-paper tracking-[0.22em] uppercase transition-transform hover:-translate-y-[1px] hover:bg-ink-2"
							>
								Sign in to continue
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// Tiny MD renderer — enough for headings, bold, italic, links, lists, paragraphs.
// Sufficient for v1 research (we control the input). Upgrade to react-markdown if we need tables/code blocks.
function MarkdownBody({ md }: { md: string }) {
	const html = renderMarkdown(md);
	// biome-ignore lint/security/noDangerouslySetInnerHtml: content authored by us, escaped within renderMarkdown
	return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderInline(s: string): string {
	let out = escapeHtml(s);
	out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
	out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
	out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
	out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, href) => {
		const safeHref = /^https?:\/\//.test(href) ? href : `#${href}`;
		return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${t}</a>`;
	});
	return out;
}

function renderMarkdown(md: string): string {
	const lines = md.replace(/\r\n/g, "\n").split("\n");
	const out: string[] = [];
	let inList = false;

	const flushList = () => {
		if (inList) {
			out.push("</ul>");
			inList = false;
		}
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		if (!line.trim()) {
			flushList();
			continue;
		}
		const h = /^(#{1,4})\s+(.+)$/.exec(line);
		if (h) {
			flushList();
			const level = Math.min(h[1].length + 1, 5); // h1 in md → h2 on page (h1 already used)
			out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
			continue;
		}
		const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
		if (bullet) {
			if (!inList) {
				out.push("<ul>");
				inList = true;
			}
			out.push(`<li>${renderInline(bullet[1])}</li>`);
			continue;
		}
		flushList();
		out.push(`<p>${renderInline(line)}</p>`);
	}
	flushList();
	return out.join("\n");
}

function formatType(t: string): string {
	return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}
