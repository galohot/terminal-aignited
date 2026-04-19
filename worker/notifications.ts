// Research fan-out — email (Resend) + Telegram channel broadcast.
// Best-effort: per-recipient failures are logged and swallowed so one bad
// address doesn't stall the batch. Telegram = single channel post.

import type { Article } from "./research";

export interface NotificationsEnv {
	RESEND_API_KEY?: string;
	TELEGRAM_NEWSLETTER_BOT_TOKEN?: string;
	TELEGRAM_NEWSLETTER_CHAT_ID?: string;
}

const FROM_EMAIL = "AIgnited Research <research@aignited.id>";
const SITE_ORIGIN = "https://terminal.aignited.id";

function articleUrl(slug: string): string {
	return `${SITE_ORIGIN}/research/${slug}`;
}

function firstParagraphs(md: string, n: number): string {
	return md.split(/\n\s*\n/).filter((p) => p.trim()).slice(0, n).join("\n\n");
}

function typeLabel(type: string): string {
	if (type === "am_brief") return "AM Brief";
	if (type === "deep_dive") return "Deep Dive";
	if (type === "earnings_preview") return "Earnings Preview";
	return "Research";
}

function emailHtml(article: Article, recipientName: string | null): string {
	const preview = firstParagraphs(article.body_md, 2);
	const url = articleUrl(article.slug);
	const tickers = article.tickers.slice(0, 8).join(" · ");
	const label = typeLabel(article.type);
	return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#141735;background:#fafaf7;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e5de;border-radius:16px;padding:32px 28px;">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#c2410c;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(label)} — AIgnited Research</div>
    <h1 style="font-size:26px;line-height:1.2;margin:4px 0 12px;color:#141735;">${escapeHtml(article.title)}</h1>
    <p style="color:#4a4e6e;font-size:14px;line-height:1.5;margin:0 0 20px;">${escapeHtml(article.summary)}</p>
    ${tickers ? `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#6b6f8a;margin-bottom:20px;">${escapeHtml(tickers)}</div>` : ""}
    <div style="border-top:1px solid #e5e5de;padding-top:20px;color:#2c2f4a;font-size:14px;line-height:1.6;">
      ${markdownToBasicHtml(preview)}
    </div>
    <div style="margin-top:24px;">
      <a href="${url}" style="display:inline-block;background:#141735;color:#fafaf7;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Read full brief →</a>
    </div>
    <p style="color:#9a9db3;font-size:12px;margin-top:32px;border-top:1px solid #f0f0e9;padding-top:16px;">
      You're receiving this because you opted in on terminal.aignited.id.
      ${recipientName ? `Hi ${escapeHtml(recipientName)}, ` : ""}<a href="${SITE_ORIGIN}/research" style="color:#6b6f8a;">Manage preferences</a>.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// Dead-simple MD → HTML for preview (## headings, paragraphs, **bold**). Enough for email body.
function markdownToBasicHtml(md: string): string {
	const blocks = md.split(/\n\s*\n/);
	return blocks
		.map((b) => {
			const trimmed = b.trim();
			if (trimmed.startsWith("## ")) {
				return `<h2 style="font-size:18px;margin:20px 0 10px;color:#141735;">${escapeHtml(trimmed.slice(3))}</h2>`;
			}
			const withBold = escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
			return `<p style="margin:0 0 12px;">${withBold}</p>`;
		})
		.join("\n");
}

async function sendEmail(
	apiKey: string,
	to: string,
	subject: string,
	html: string,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
		});
		if (!res.ok) {
			const txt = await res.text();
			return { ok: false, error: `resend ${res.status}: ${txt.slice(0, 200)}` };
		}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: `resend fetch: ${e instanceof Error ? e.message : String(e)}` };
	}
}

export async function broadcastToTelegram(
	env: NotificationsEnv,
	article: Article,
): Promise<{ ok: boolean; error?: string }> {
	if (!env.TELEGRAM_NEWSLETTER_BOT_TOKEN || !env.TELEGRAM_NEWSLETTER_CHAT_ID) {
		return { ok: false, error: "telegram not configured" };
	}
	const url = articleUrl(article.slug);
	const preview = firstParagraphs(article.body_md, 1).slice(0, 500);
	const tickers = article.tickers.slice(0, 8).join(" · ");
	// HTML parse mode — Telegram supports a small subset.
	const text = [
		`<b>${escapeHtml(article.title)}</b>`,
		"",
		escapeHtml(article.summary),
		"",
		tickers ? `<code>${escapeHtml(tickers)}</code>` : "",
		"",
		escapeHtml(preview),
		"",
		`<a href="${url}">Read full brief →</a>`,
	]
		.filter(Boolean)
		.join("\n");

	try {
		const res = await fetch(
			`https://api.telegram.org/bot${env.TELEGRAM_NEWSLETTER_BOT_TOKEN}/sendMessage`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: env.TELEGRAM_NEWSLETTER_CHAT_ID,
					text,
					parse_mode: "HTML",
					disable_web_page_preview: false,
				}),
			},
		);
		if (!res.ok) {
			const txt = await res.text();
			return { ok: false, error: `telegram ${res.status}: ${txt.slice(0, 200)}` };
		}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: `telegram fetch: ${e instanceof Error ? e.message : String(e)}` };
	}
}

export async function fanoutEmails(
	env: NotificationsEnv,
	article: Article,
	recipients: Array<{ email: string; name: string | null }>,
): Promise<{ sent: number; failed: number }> {
	if (!env.RESEND_API_KEY) return { sent: 0, failed: 0 };
	let sent = 0;
	let failed = 0;
	const subject = `${article.title} — AIgnited Research`;
	// Resend allows ~10 req/s on free tier. Process serially with light throttle.
	for (const r of recipients) {
		const result = await sendEmail(env.RESEND_API_KEY, r.email, subject, emailHtml(article, r.name));
		if (result.ok) sent++;
		else {
			failed++;
			console.warn(`[notifications] email to ${r.email} failed: ${result.error}`);
		}
	}
	return { sent, failed };
}
