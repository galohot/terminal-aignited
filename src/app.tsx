import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/layout/app-shell";
import type { ApiError } from "./lib/api";
import { ChartsPage } from "./pages/charts";
import { DashboardPage } from "./pages/dashboard";
import { FinancialsPage } from "./pages/financials";
import { IdxCompanyPage } from "./pages/idx-company";
import { IdxEntitiesPage } from "./pages/idx-entities";
import { IdxExplorerPage } from "./pages/idx-explorer";
import { IdxInsidersPage } from "./pages/idx-insiders";
import { IdxScreenerPage } from "./pages/idx-screener";
import { StockPage } from "./pages/stock";
import { WatchlistPage } from "./pages/watchlist";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if ((error as ApiError).status === 429) return false;
				return failureCount < 3;
			},
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
						<Route path="/stock/:symbol" element={<StockPage />} />
						<Route path="/stock/:symbol/financials" element={<FinancialsPage />} />
						<Route path="/idx" element={<IdxExplorerPage />} />
						<Route path="/idx/insiders" element={<IdxInsidersPage />} />
						<Route path="/idx/screener" element={<IdxScreenerPage />} />
						<Route path="/idx/entities" element={<IdxEntitiesPage />} />
						<Route path="/idx/:kode" element={<IdxCompanyPage />} />
						<Route path="/watchlist" element={<WatchlistPage />} />
						<Route path="/charts" element={<ChartsPage />} />
					</Routes>
				</AppShell>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
