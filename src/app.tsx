import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { ErrorBoundary } from "./components/error-boundary";
import { AppShell } from "./components/layout/app-shell";
import type { ApiError } from "./lib/api";
import { ChartsPage } from "./pages/charts";
import { DashboardPage } from "./pages/dashboard";
import { FinancialsPage } from "./pages/financials";
import { IdxCompanyPage } from "./pages/idx-company";
import { IdxEntitiesPage } from "./pages/idx-entities";
import { IdxExplorerPage } from "./pages/idx-explorer";
import { IdxFlowPage } from "./pages/idx-flow";
import { IdxInsidersPage } from "./pages/idx-insiders";
import { IdxMoversPage } from "./pages/idx-movers";
import { IdxScreenerPage } from "./pages/idx-screener";
import { NotFoundPage } from "./pages/not-found";
import { StockPage } from "./pages/stock";
import { WatchlistPage } from "./pages/watchlist";
import { SignalsPage } from "./pages/signals";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if ((error as ApiError).status === 429) return false;
				return failureCount < 3;
			},
			retryDelay: (attemptIndex, error) => {
				const retryAfter = (error as ApiError).retryAfter;
				if (retryAfter) return retryAfter * 1000;
				return Math.min(1000 * 2 ** attemptIndex, 30_000);
			},
		},
	},
});

export function App() {
	return (
		<ErrorBoundary>
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
							<Route path="/idx/movers" element={<IdxMoversPage />} />
							<Route path="/idx/flow" element={<IdxFlowPage />} />
							<Route path="/idx/entities" element={<IdxEntitiesPage />} />
							<Route path="/idx/:kode" element={<IdxCompanyPage />} />
							<Route path="/watchlist" element={<WatchlistPage />} />
							<Route path="/charts" element={<ChartsPage />} />
							<Route path="/signals" element={<SignalsPage />} />
							<Route path="*" element={<NotFoundPage />} />
						</Routes>
					</AppShell>
				</BrowserRouter>
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
