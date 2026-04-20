// Minimal WorkOS User Management HTTP client — no SDK needed.

const WORKOS_API = "https://api.workos.com";

export interface WorkOSUser {
	id: string;
	email: string;
	email_verified?: boolean;
	first_name?: string | null;
	last_name?: string | null;
	profile_picture_url?: string | null;
}

export function buildAuthorizeUrl(params: {
	clientId: string;
	redirectUri: string;
	state: string;
}): string {
	const q = new URLSearchParams({
		response_type: "code",
		client_id: params.clientId,
		redirect_uri: params.redirectUri,
		provider: "GoogleOAuth",
		state: params.state,
	});
	return `${WORKOS_API}/user_management/authorize?${q.toString()}`;
}

export async function authenticateWithCode(params: {
	clientId: string;
	apiKey: string;
	code: string;
}): Promise<WorkOSUser> {
	const res = await fetch(`${WORKOS_API}/user_management/authenticate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "authorization_code",
			client_id: params.clientId,
			client_secret: params.apiKey,
			code: params.code,
		}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`workos authenticate failed ${res.status}: ${text}`);
	}
	const data = (await res.json()) as { user: WorkOSUser };
	return data.user;
}

export function displayName(u: WorkOSUser): string | null {
	const parts = [u.first_name, u.last_name].filter(Boolean);
	return parts.length ? parts.join(" ") : null;
}
