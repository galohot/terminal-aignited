import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { ErrorBoundary } from "./components/error-boundary";
import { AppShell } from "./components/layout/app-shell";
import { PageLoading } from "./components/ui/loading";
import { AuthProvider } from "./contexts/auth";
import type { ApiError } from "./lib/api";
import { AgentPage } from "./pages/agent";
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
import { PortfolioPage } from "./pages/portfolio";
import { PricingPage } from "./pages/pricing";
import { AdminResearchPage } from "./pages/admin-research";
import { ResearchPage } from "./pages/research";
import { ResearchArticlePage } from "./pages/research-article";
import { SignalsPage } from "./pages/signals";
import { StockPage } from "./pages/stock";
import { WatchlistPage } from "./pages/watchlist";

const IdxOwnershipPage = lazy(() =>
	import("./pages/idx-ownership").then((m) => ({ default: m.IdxOwnershipPage })),
);
const IdxOwnershipNetworkPage = lazy(() =>
	import("./pages/idx-ownership-network").then((m) => ({ default: m.IdxOwnershipNetworkPage })),
);
const IdxOwnershipCompaniesPage = lazy(() =>
	import("./pages/idx-ownership-companies").then((m) => ({ default: m.IdxOwnershipCompaniesPage })),
);
const IdxOwnershipInvestorsPage = lazy(() =>
	import("./pages/idx-ownership-investors").then((m) => ({ default: m.IdxOwnershipInvestorsPage })),
);
const IdxOwnershipInvestorPage = lazy(() =>
	import("./pages/idx-ownership-investor").then((m) => ({ default: m.IdxOwnershipInvestorPage })),
);
const IdxMacroPage = lazy(() =>
	import("./pages/idx-macro").then((m) => ({ default: m.IdxMacroPage })),
);

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
				<AuthProvider>
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
								<Route
									path="/idx/ownership"
									element={
										<Suspense fallback={<PageLoading />}>
											<IdxOwnershipPage />
										</Suspense>
									}
								/>
								<Route
									path="/idx/ownership/network"
									element={
										<Suspense fallback={<PageLoading />}>
											<IdxOwnershipNetworkPage />
										</Suspense>
									}
								/>
								<Route
									path="/idx/ownership/companies"
									element={
										<Suspense fallback={<PageLoading />}>
											<IdxOwnershipCompaniesPage />
										</Suspense>
									}
								/>
								<Route
									path="/idx/ownership/investors"
									element={
										<Suspense fallback={<PageLoading />}>
											<IdxOwnershipInvestorsPage />
										</Suspense>
									}
								/>
								<Route
									path="/idx/ownership/investor/:name"
									element={
										<Suspense fallback={<PageLoading />}>
											<IdxOwnershipInvestorPage />
										</Suspense>
									}
								/>
								<Route
									path="/idx/macro"
									element={
										<Suspense fallback={<PageLoading />}>
											<IdxMacroPage />
										</Suspense>
									}
								/>
								<Route path="/idx/entities" element={<IdxEntitiesPage />} />
								<Route path="/idx/:kode" element={<IdxCompanyPage />} />
								<Route path="/watchlist" element={<WatchlistPage />} />
								<Route path="/charts" element={<ChartsPage />} />
								<Route path="/signals" element={<SignalsPage />} />
								<Route path="/agent" element={<AgentPage />} />
								<Route path="/portfolio" element={<PortfolioPage />} />
								<Route path="/pricing" element={<PricingPage />} />
								<Route path="/research" element={<ResearchPage />} />
								<Route path="/research/:slug" element={<ResearchArticlePage />} />
								<Route path="/admin/research" element={<AdminResearchPage />} />
								<Route path="*" element={<NotFoundPage />} />
							</Routes>
						</AppShell>
					</BrowserRouter>
				</AuthProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
