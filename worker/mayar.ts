// Thin Mayar API client.
// Prod base: https://api.mayar.id/hl/v1 — auth via Bearer <MAYAR_API_KEY>.

const MAYAR_BASE = "https://api.mayar.id/hl/v1";

interface CreateInvoiceInput {
	apiKey: string;
	name: string;
	email: string;
	amount: number;
	description: string;
	redirectUrl: string;
	mobile?: string;
}

export interface MayarInvoice {
	id: string;
	link: string;
	status: string;
	amount: number;
	customerEmail?: string;
	customerName?: string;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<MayarInvoice> {
	const body = {
		name: input.name,
		email: input.email,
		amount: input.amount,
		description: input.description,
		mobile: input.mobile ?? "081000000000",
		redirectUrl: input.redirectUrl,
	};

	const res = await fetch(`${MAYAR_BASE}/invoice/create`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${input.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`mayar invoice/create ${res.status}: ${text.slice(0, 300)}`);
	}

	const json = (await res.json()) as {
		statusCode: number;
		data?: MayarInvoice;
		messages?: string;
	};
	if (!json.data) throw new Error(`mayar invoice/create: ${json.messages ?? "no data"}`);
	return json.data;
}

export async function getInvoice(apiKey: string, id: string): Promise<MayarInvoice> {
	const res = await fetch(`${MAYAR_BASE}/invoice/${id}`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`mayar invoice/${id} ${res.status}: ${text.slice(0, 300)}`);
	}
	const json = (await res.json()) as { data?: MayarInvoice; messages?: string };
	if (!json.data) throw new Error(`mayar invoice/${id}: ${json.messages ?? "no data"}`);
	return json.data;
}
