import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/layout/app-shell";
import { DashboardPage } from "./pages/dashboard";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			refetchOnWindowFocus: false,
		},
	},
});

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AppShell>
					<Routes>
						<Route path="/" element={<DashboardPage />} />
					</Routes>
				</AppShell>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
