import { MarketGrid } from "../components/market/market-grid";
import { usePageTitle } from "../hooks/use-page-title";

export function DashboardPage() {
	usePageTitle();
	return <MarketGrid />;
}
