// HMAC-SHA256 signer for Worker → market-api user identity.
// Pairs with `market-api/src/worker_auth.rs` (WorkerAuthedUser extractor).
// Contract: signature = hex(HMAC(secret, `${userId}.${ts}`)), ts = unix seconds.

export interface SignedIdentity {
	ts: number;
	sig: string;
}

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function getKey(secret: string): Promise<CryptoKey> {
	if (cachedKey && cachedKey.secret === secret) return cachedKey.key;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	cachedKey = { secret, key };
	return key;
}

function toHex(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let out = "";
	for (let i = 0; i < bytes.length; i++) {
		out += bytes[i].toString(16).padStart(2, "0");
	}
	return out;
}

export async function signUser(secret: string, userId: string): Promise<SignedIdentity> {
	const ts = Math.floor(Date.now() / 1000);
	const key = await getKey(secret);
	const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}.${ts}`));
	return { ts, sig: toHex(mac) };
}
