interface Env {
	API_BASE_URL: string;
	API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	const { request, env, params } = context;

	// Handle CORS preflight
	if (request.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	// Reconstruct the backend path
	const pathSegments = (params.path as string[]) || [];
	const backendPath = `/api/v1/${pathSegments.join("/")}`;
	const url = new URL(backendPath, env.API_BASE_URL);

	// Forward query params
	const reqUrl = new URL(request.url);
	reqUrl.searchParams.forEach((value, key) => {
		url.searchParams.set(key, value);
	});

	// Forward to backend with API key
	const response = await fetch(url.toString(), {
		method: request.method,
		headers: {
			"X-API-Key": env.API_KEY,
			"Content-Type": "application/json",
		},
	});

	// Return with CORS headers
	const headers = new Headers(response.headers);
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Cache-Control", "public, max-age=10");

	return new Response(response.body, {
		status: response.status,
		headers,
	});
};
