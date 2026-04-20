import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { RequireAuth } from "./components/auth/require-auth";
import { ErrorBoundary } from "./components/error-boundary";
import { AppShell } from "./components/layout/app-shell";
import { PageLoading } from "./components/ui/loading";
import { AuthProvider, useAuth } from "./contexts/auth";
import type { ApiError } from "./lib/api";
import { AgentPage } from "./pages/agent";
import { ChartsPage } from "./pages/charts";
import { DashboardPage } from "./pages/dashboard";
import { LandingPage } from "./pages/landing";
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
import { PortfolioAnalyticsPage } from "./pages/portfolio-analytics";
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

function Home() {
	const { state } = useAuth();
	if (state.status === "loading") return <PageLoading />;
	if (state.status === "unauth") return <LandingPage />;
	return <DashboardPage />;
}

export function App() {
	return (
		<ErrorBoundary>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<BrowserRouter>
						<AppShell>
							<Routes>
								<Route path="/" element={<Home />} />

								{/* Public — no sign-in required */}
								<Route path="/stock/:symbol" element={<StockPage />} />
								<Route path="/stock/:symbol/financials" element={<FinancialsPage />} />
								<Route path="/research" element={<ResearchPage />} />
								<Route path="/research/:slug" element={<ResearchArticlePage />} />
								<Route path="/pricing" element={<PricingPage />} />

								{/* Auth-gated */}
								<Route
									path="/idx"
									element={
										<RequireAuth featureName="IDX Explorer">
											<IdxExplorerPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/insiders"
									element={
										<RequireAuth featureName="Insiders">
											<IdxInsidersPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/screener"
									element={
										<RequireAuth featureName="Screener">
											<IdxScreenerPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/movers"
									element={
										<RequireAuth featureName="Movers">
											<IdxMoversPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/flow"
									element={
										<RequireAuth featureName="Flow">
											<IdxFlowPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/ownership"
									element={
										<RequireAuth featureName="Ownership">
											<Suspense fallback={<PageLoading />}>
												<IdxOwnershipPage />
											</Suspense>
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/ownership/network"
									element={
										<RequireAuth featureName="Ownership Network">
											<Suspense fallback={<PageLoading />}>
												<IdxOwnershipNetworkPage />
											</Suspense>
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/ownership/companies"
									element={
										<RequireAuth featureName="Ownership by Company">
											<Suspense fallback={<PageLoading />}>
												<IdxOwnershipCompaniesPage />
											</Suspense>
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/ownership/investors"
									element={
										<RequireAuth featureName="Ownership by Investor">
											<Suspense fallback={<PageLoading />}>
												<IdxOwnershipInvestorsPage />
											</Suspense>
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/ownership/investor/:name"
									element={
										<RequireAuth featureName="Investor Profile">
											<Suspense fallback={<PageLoading />}>
												<IdxOwnershipInvestorPage />
											</Suspense>
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/macro"
									element={
										<RequireAuth featureName="Macro">
											<Suspense fallback={<PageLoading />}>
												<IdxMacroPage />
											</Suspense>
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/entities"
									element={
										<RequireAuth featureName="Power Map">
											<IdxEntitiesPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/idx/:kode"
									element={
										<RequireAuth featureName="IDX Company">
											<IdxCompanyPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/watchlist"
									element={
										<RequireAuth featureName="Watchlist">
											<WatchlistPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/charts"
									element={
										<RequireAuth featureName="Charts">
											<ChartsPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/signals"
									element={
										<RequireAuth featureName="Signals">
											<SignalsPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/agent"
									element={
										<RequireAuth featureName="Agent">
											<AgentPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/portfolio"
									element={
										<RequireAuth featureName="Portfolio">
											<PortfolioPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/portfolio/analytics"
									element={
										<RequireAuth featureName="Portfolio Analytics">
											<PortfolioAnalyticsPage />
										</RequireAuth>
									}
								/>
								<Route
									path="/admin/research"
									element={
										<RequireAuth featureName="Admin · Research">
											<AdminResearchPage />
										</RequireAuth>
									}
								/>
								<Route path="*" element={<NotFoundPage />} />
							</Routes>
						</AppShell>
					</BrowserRouter>
				</AuthProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
