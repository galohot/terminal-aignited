// Billing: Mayar invoice checkout + webhook handler.
// Flow:
//   1. POST /api/billing/checkout {tier} -> insert pending terminal_subscriptions row,
//      create Mayar invoice with description mentioning sub id, return link.
//   2. Mayar webhooks POST /api/billing/webhook on payment.received.
//      We verify the token, fetch the invoice to confirm status=paid, then flip
//      the pending row to active with expires_at = now + 30 days.

import { neon } from "@neondatabase/serverless";
import { createInvoice, getInvoice } from "./mayar";

export type Tier = "starter" | "pro" | "institutional";

interface TierSpec {
	priceIdr: number;
	label: string;
}

export const TIERS: Record<Tier, TierSpec> = {
	starter: { priceIdr: 49_000, label: "AIgnited Terminal Starter" },
	pro: { priceIdr: 149_000, label: "AIgnited Terminal Pro" },
	institutional: { priceIdr: 499_000, label: "AIgnited Terminal Institutional" },
};

function newSubId(): string {
	return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CheckoutInput {
	authDbUrl: string;
	mayarApiKey: string;
	userId: string;
	email: string;
	name: string;
	tier: Tier;
	origin: string;
}

export async function createCheckout(
	input: CheckoutInput,
): Promise<{ link: string; subId: string }> {
	const spec = TIERS[input.tier];
	const subId = newSubId();
	const sql = neon(input.authDbUrl);

	await sql`
		INSERT INTO terminal_subscriptions (id, user_id, tier, status, created_at)
		VALUES (${subId}, ${input.userId}, ${input.tier}, 'pending', now())
	`;

	const invoice = await createInvoice({
		apiKey: input.mayarApiKey,
		name: input.name,
		email: input.email,
		amount: spec.priceIdr,
		description: `${spec.label} · sub=${subId}`,
		redirectUrl: `${input.origin}/pricing?paid=${subId}`,
	});

	await sql`
		UPDATE terminal_subscriptions SET mayar_invoice_id = ${invoice.id}
		WHERE id = ${subId}
	`;

	return { link: invoice.link, subId };
}

interface WebhookBody {
	event?: string;
	data?: {
		id?: string;
		status?: string;
		amount?: number;
		customerEmail?: string;
		custom_field?: Record<string, unknown>;
	};
}

export interface WebhookInput {
	authDbUrl: string;
	mayarApiKey: string;
	webhookToken: string;
	callbackToken: string | null;
	body: WebhookBody;
}

export async function handleWebhook(
	input: WebhookInput,
): Promise<{ ok: boolean; message: string }> {
	// Mayar standard: X-Callback-Token header. The webhook-hub dispatcher
	// forwards this header through unchanged.
	if (!input.callbackToken || input.callbackToken !== input.webhookToken) {
		return { ok: false, message: "invalid token" };
	}

	const event = input.body.event;
	const invoiceId = input.body.data?.id;
	if (!invoiceId) return { ok: false, message: "no invoice id" };

	// Only act on payment events; ignore noise.
	if (event !== "payment.received" && event !== "payment.success") {
		return { ok: true, message: `ignored event: ${event}` };
	}

	// Verify with Mayar directly — webhook body alone is not trusted.
	const invoice = await getInvoice(input.mayarApiKey, invoiceId);
	const status = (invoice.status || "").toLowerCase();
	if (status !== "paid" && status !== "success") {
		return { ok: false, message: `invoice not paid: ${invoice.status}` };
	}

	const sql = neon(input.authDbUrl);
	// Activate the pending row for this invoice, set 30-day expiry.
	const rows = (await sql`
		UPDATE terminal_subscriptions
		SET status = 'active',
		    started_at = COALESCE(started_at, now()),
		    expires_at = GREATEST(COALESCE(expires_at, now()), now()) + interval '30 days'
		WHERE mayar_invoice_id = ${invoiceId}
		  AND status IN ('pending', 'active', 'expired')
		RETURNING id, user_id, tier, expires_at
	`) as Array<{ id: string; user_id: string; tier: string; expires_at: string }>;

	if (rows.length === 0) {
		return { ok: false, message: `no sub row for invoice ${invoiceId}` };
	}

	return { ok: true, message: `activated sub ${rows[0].id} for user ${rows[0].user_id}` };
}
