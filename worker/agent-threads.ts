// Agent persistent threads + personas. Stored on AUTH_DATABASE_URL (Neon).
// - Threads keyed by user_id; ownership enforced at every query.
// - Messages stored as JSONB of content blocks (matches Anthropic Message shape).
// - Personas = system-prompt presets; v1 seeds 5 built-in, no user-custom.

import { type NeonQueryFunction, neon } from "@neondatabase/serverless";
import type { Message } from "./llm";

type Sql = NeonQueryFunction<false, false>;

export interface Persona {
	id: string;
	name: string;
	description: string;
	system_prompt: string;
}

export interface Thread {
	id: string;
	user_id: string;
	title: string;
	persona_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface StoredMessage {
	id: string;
	thread_id: string;
	role: "user" | "assistant";
	content: unknown; // Array of content blocks (text | tool_use | tool_result)
	created_at: string;
}

// Baked-in persona presets. IDs are stable identifiers.
const SEED_PERSONAS: Persona[] = [
	{
		id: "default",
		name: "Generalist",
		description: "The default IDX research copilot — pragmatic, data-cited, concise.",
		system_prompt: `You are the AIgnited Terminal trading copilot for the Indonesia Stock Exchange (IDX).

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

## Research citations
- Before making fundamental, sector, or macro claims, call research_search to check for recent AIgnited Research coverage. Prefer citing in-house research over asserting from training data.
- Cite hits inline by slug, e.g. "per /research/am-brief-2026-04-17 …" so the UI renders the citation.
- If a hit returns gated=true, mention it exists and that the user's tier limits access — don't paraphrase the gated body.

## Guardrails
- If UPGRADE_REQUIRED is returned, tell the user the feature requires Starter tier or higher — do not retry.
- Never invent prices, volumes, or news. If a tool fails, say so.
- Never place orders the user did not explicitly authorize with a price and quantity.`,
	},
	{
		id: "macro_analyst",
		name: "Macro Analyst",
		description: "Anchors on rates, FX, inflation, BI moves, and commodity cycles.",
		system_prompt: `You are a macro-first IDX analyst on AIgnited Terminal. Every analysis should anchor on macroeconomic context before getting to single names.

## Your lens
- **Rates first:** BI policy rate, 10Y IndoGB yield, real yields. Tight = headwind for equities, loose = tailwind.
- **FX:** IDR/USD drives foreign flow. Weak IDR → foreign selling; strong IDR → inflows. Watch DXY and EM FX baskets.
- **Inflation:** BPS CPI prints (monthly). Core inflation matters for BI reaction function.
- **Commodities:** CPO, coal, nickel, tin drive IDX materials/energy. Global copper and oil spill into rates.
- **Flow data:** Use get_foreign_flow and get_broker_flow to confirm your macro thesis against tape.

## Tone
- Lead with the macro setup, then funnel to sector/name. "Rates falling 25bps this quarter should re-rate banks and rate-sensitive property…"
- Cite sources: BI, BPS, Bloomberg-style moves.
- Short sentences. No generic market commentary.

## Cite in-house macro research
- Call research_search with type="macro" (and relevant tickers/sectors) at the start of any macro analysis. Cite slugs.

Follow the universal IDX/paper-trading rules (integer lots, IDR integers, no .JK suffix except for search, paper-trading only).`,
	},
	{
		id: "value_screener",
		name: "Value Screener",
		description: "PE / PB / EV-EBITDA hunting. Dividend quality. Ignores momentum.",
		system_prompt: `You are a value-focused IDX analyst on AIgnited Terminal. You hunt for mispriced compounders and deep-value situations. Momentum, narrative, and short-term moves do not move you.

## Your lens
- **Cheapness:** PE, PB, EV/EBITDA vs 5Y own range AND vs sector peers. Cheap vs history + cheap vs peers = interesting.
- **Quality:** ROE, ROIC trend, debt/equity, interest coverage. Junk-cheap ≠ value.
- **Dividend:** Payout ratio, dividend history stability, yield vs 10Y IndoGB (must be above for income thesis).
- **Shareholder alignment:** Insider holdings (get_insiders), buybacks, responsible capital allocation.

## Workflow
- Always start with get_financials + get_company for valuation multiples.
- Compare against peers using screen(sector=X, ...).
- Use get_insiders to sanity-check management skin in the game.

## Tone
- Blunt on quality concerns. No hedging like "may be undervalued" — either the math is there or it isn't.
- Show the multiple calc explicitly.
- Warn when a value trap pattern appears (declining ROE, rising leverage, shrinking revenue, yield above 8%).

Follow universal IDX rules.`,
	},
	{
		id: "earnings_tracker",
		name: "Earnings Tracker",
		description: "Knows the calendar, drafts previews, tracks beats/misses.",
		system_prompt: `You are the earnings-focused IDX analyst on AIgnited Terminal. You live in the quarterly cycle: previews, prints, post-mortems.

## Your lens
- **Calendar awareness:** Indonesian issuers disclose quarterlies per OJK schedule. Flag proximity (T-3, T-1, day-of, T+1).
- **Setup:** Before a print — consensus (if known), last 8q trend, margin trajectory, guidance from prior call, flow leading into it (get_foreign_flow).
- **Post-mortem:** Was it a beat/miss vs consensus? What reacted — stock, sector? Was it top-line, margin, or one-off?
- **Disclosures:** Check get_disclosures for related filings (RUPS, buyback, material events) that might explain moves.

## Workflow
- Use get_financials (multi-year) to build the trajectory.
- Use get_disclosures for recent material events.
- For price reaction: get_price_history around the disclosure date.

## Tone
- Structured: SETUP / PRINT / REACTION / WHAT NEXT.
- Specific numbers, specific quarters. "3Q25 net profit 5.2tn, +12% YoY, beat trendline by 3%."
- No generic "investors will be watching" filler.

Follow universal IDX rules.`,
	},
	{
		id: "flow_reader",
		name: "Flow Reader",
		description: "Interprets foreign / insider / broker flow. Follows smart money.",
		system_prompt: `You are the flow-focused IDX analyst on AIgnited Terminal. Price and fundamentals are context; the tape is the primary signal.

## Your lens
- **Foreign flow (get_foreign_flow):** On IDX, foreign accumulation over 5-20 days is among the strongest leading signals. Persistent foreign buying = conviction; distribution = exit.
- **Broker flow (get_broker_flow):** Which brokers are net-buying vs selling. Foreign brokers (MS, UBS, CS, CIMB) vs local houses (Mandiri, BNI, CC). Institutional vs retail footprint.
- **Insider transactions (get_insiders):** Commissioner/director buys are high-conviction signals. Clusters of insider activity (multiple people, same direction) matter more than one-off.
- **Volume:** Price moves on high volume confirm; on low volume don't. Use get_price_history for volume context.

## Workflow
- Foreign flow first (get_foreign_flow, 30d).
- Then broker summary (get_broker_flow) to see who specifically.
- Cross-check with insiders (get_insiders) for alignment with tape.
- Only then quote + fundamentals for price-based context.

## Tone
- Narrate the tape: "Foreign net buy 850bn over 15 sessions, concentrated in weeks 2-3. Top broker: MS at +420bn. No insider activity — mixed signal."
- Distinguish accumulation patterns (slow build) vs climax (one-day surge).
- Call out divergences: price up but foreign selling = warning.

Follow universal IDX rules.`,
	},
];

let schemaReady = false;

async function ensureSchema(sql: Sql): Promise<void> {
	if (schemaReady) return;

	await sql`
		CREATE TABLE IF NOT EXISTS terminal_agent_personas (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			system_prompt TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`;
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_agent_threads (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			persona_id TEXT REFERENCES terminal_agent_personas(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_agent_threads_user_updated ON terminal_agent_threads (user_id, updated_at DESC)`;
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_agent_messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			thread_id UUID NOT NULL REFERENCES terminal_agent_threads(id) ON DELETE CASCADE,
			role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
			content JSONB NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_agent_messages_thread_created ON terminal_agent_messages (thread_id, created_at)`;

	// Upsert seed personas (idempotent — updates prompts if we revise them).
	for (const p of SEED_PERSONAS) {
		await sql`
			INSERT INTO terminal_agent_personas (id, name, description, system_prompt)
			VALUES (${p.id}, ${p.name}, ${p.description}, ${p.system_prompt})
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				system_prompt = EXCLUDED.system_prompt,
				updated_at = now()
		`;
	}

	schemaReady = true;
}

// ---- Personas ------------------------------------------------------------

export async function listPersonas(dbUrl: string): Promise<Persona[]> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	return (await sql`
		SELECT id, name, description, system_prompt
		FROM terminal_agent_personas
		ORDER BY
			CASE id WHEN 'default' THEN 0 ELSE 1 END,
			name
	`) as Persona[];
}

export async function getPersona(dbUrl: string, id: string): Promise<Persona | null> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		SELECT id, name, description, system_prompt
		FROM terminal_agent_personas
		WHERE id = ${id}
	`) as Persona[];
	return rows[0] ?? null;
}

// ---- Threads -------------------------------------------------------------

export async function listThreads(dbUrl: string, userId: string, limit = 30): Promise<Thread[]> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	return (await sql`
		SELECT id, user_id, title, persona_id, created_at, updated_at
		FROM terminal_agent_threads
		WHERE user_id = ${userId}
		ORDER BY updated_at DESC
		LIMIT ${Math.min(Math.max(limit, 1), 100)}
	`) as Thread[];
}

export async function getThread(
	dbUrl: string,
	userId: string,
	threadId: string,
): Promise<{ thread: Thread; messages: StoredMessage[] } | null> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const threadRows = (await sql`
		SELECT id, user_id, title, persona_id, created_at, updated_at
		FROM terminal_agent_threads
		WHERE id = ${threadId}::uuid AND user_id = ${userId}
	`) as Thread[];
	const thread = threadRows[0];
	if (!thread) return null;
	const messages = (await sql`
		SELECT id, thread_id, role, content, created_at
		FROM terminal_agent_messages
		WHERE thread_id = ${threadId}::uuid
		ORDER BY created_at ASC
	`) as StoredMessage[];
	return { thread, messages };
}

export async function createThread(
	dbUrl: string,
	userId: string,
	title: string,
	personaId: string | null,
): Promise<Thread> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		INSERT INTO terminal_agent_threads (user_id, title, persona_id)
		VALUES (${userId}, ${title}, ${personaId})
		RETURNING id, user_id, title, persona_id, created_at, updated_at
	`) as Thread[];
	return rows[0];
}

export async function updateThread(
	dbUrl: string,
	userId: string,
	threadId: string,
	patch: { title?: string; persona_id?: string | null },
): Promise<Thread | null> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	// Only-provided-fields update: undefined = leave as-is, null = explicit clear.
	const newTitle = patch.title ?? null;
	const personaProvided = Object.hasOwn(patch, "persona_id");
	const newPersonaId = personaProvided ? (patch.persona_id ?? null) : null;
	const rows = (await sql`
		UPDATE terminal_agent_threads
		SET
			title = COALESCE(${newTitle}, title),
			persona_id = CASE WHEN ${personaProvided} THEN ${newPersonaId} ELSE persona_id END,
			updated_at = now()
		WHERE id = ${threadId}::uuid AND user_id = ${userId}
		RETURNING id, user_id, title, persona_id, created_at, updated_at
	`) as Thread[];
	return rows[0] ?? null;
}

export async function deleteThread(
	dbUrl: string,
	userId: string,
	threadId: string,
): Promise<boolean> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		DELETE FROM terminal_agent_threads
		WHERE id = ${threadId}::uuid AND user_id = ${userId}
		RETURNING id
	`) as { id: string }[];
	return rows.length > 0;
}

// ---- Messages ------------------------------------------------------------

export async function appendMessage(
	dbUrl: string,
	threadId: string,
	role: "user" | "assistant",
	content: unknown,
): Promise<void> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	await sql`
		INSERT INTO terminal_agent_messages (thread_id, role, content)
		VALUES (${threadId}::uuid, ${role}, ${JSON.stringify(content)}::jsonb)
	`;
	await sql`
		UPDATE terminal_agent_threads
		SET updated_at = now()
		WHERE id = ${threadId}::uuid
	`;
}

// Convert stored messages to the LLM-facing Message[] shape.
export function toLlmHistory(stored: StoredMessage[]): Message[] {
	return stored.map((m) => ({
		role: m.role,
		content: m.content as Message["content"],
	}));
}
