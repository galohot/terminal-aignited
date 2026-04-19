// JWT (HS256) + cookie helpers using Web Crypto — runs in Workers runtime.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array | ArrayBuffer): string {
	const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	let s = "";
	for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
	const pad = "=".repeat((4 - (s.length % 4)) % 4);
	const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export interface JwtPayload {
	sub: string;
	email: string;
	iat: number;
	exp: number;
}

export async function signJwt(
	payload: { sub: string; email: string },
	secret: string,
	ttlSeconds = 604800,
): Promise<string> {
	const header = { alg: "HS256", typ: "JWT" };
	const iat = Math.floor(Date.now() / 1000);
	const body: JwtPayload = { ...payload, iat, exp: iat + ttlSeconds };
	const h = b64urlEncode(enc.encode(JSON.stringify(header)));
	const p = b64urlEncode(enc.encode(JSON.stringify(body)));
	const data = `${h}.${p}`;
	const key = await hmacKey(secret);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
	return `${data}.${b64urlEncode(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [h, p, s] = parts;
	const key = await hmacKey(secret);
	const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(s), enc.encode(`${h}.${p}`));
	if (!ok) return null;
	try {
		const body = JSON.parse(dec.decode(b64urlDecode(p))) as JwtPayload;
		if (typeof body.exp !== "number" || body.exp < Math.floor(Date.now() / 1000)) return null;
		return body;
	} catch {
		return null;
	}
}

export function parseCookie(req: Request, name: string): string | null {
	const header = req.headers.get("cookie");
	if (!header) return null;
	for (const part of header.split(";")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
	}
	return null;
}

export function setSessionCookie(value: string, maxAgeSeconds: number): string {
	return `tai_session=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
	return `tai_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function setStateCookie(value: string): string {
	return `tai_oauth_state=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

export function randomState(): string {
	const b = new Uint8Array(24);
	crypto.getRandomValues(b);
	return b64urlEncode(b);
}

export type Tier = "starter" | "pro" | "institutional";

const TIER_ORDER: Record<Tier, number> = { starter: 1, pro: 2, institutional: 3 };

export function tierMeets(have: Tier | null | undefined, min: Tier): boolean {
	if (!have) return false;
	return TIER_ORDER[have] >= TIER_ORDER[min];
}
