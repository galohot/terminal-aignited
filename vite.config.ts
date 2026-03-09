import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [react(), tailwindcss(), cloudflare()],
		server: {
			proxy: {
				"/api/proxy": {
					target: env.API_BASE_URL || "https://terminal.thedailycatalyst.site",
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/proxy/, "/api/v1"),
					headers: {
						"X-API-Key": env.API_KEY || "",
					},
				},
			},
		},
	};
});
