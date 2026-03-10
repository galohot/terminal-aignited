import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/layout/app-shell";
import { ChartsPage } from "./pages/charts";
import { DashboardPage } from "./pages/dashboard";
import { FinancialsPage } from "./pages/financials";
import { IdxCompanyPage } from "./pages/idx-company";
import { StockPage } from "./pages/stock";
import { WatchlistPage } from "./pages/watchlist";

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
						<Route path="/stock/:symbol" element={<StockPage />} />
						<Route path="/stock/:symbol/financials" element={<FinancialsPage />} />
						<Route path="/idx/:kode" element={<IdxCompanyPage />} />
						<Route path="/watchlist" element={<WatchlistPage />} />
						<Route path="/charts" element={<ChartsPage />} />
					</Routes>
				</AppShell>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
