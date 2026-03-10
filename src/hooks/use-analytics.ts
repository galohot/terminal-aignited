import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { fetchStats, trackPageView } from "../lib/analytics";

export function usePageTracking() {
	const location = useLocation();
	const lastPath = useRef("");

	useEffect(() => {
		const path = location.pathname;
		if (path !== lastPath.current) {
			lastPath.current = path;
			trackPageView(path);
		}
	}, [location.pathname]);
}

export function useSiteStats() {
	return useQuery({
		queryKey: ["site-stats"],
		queryFn: fetchStats,
		staleTime: 15_000,
		refetchInterval: 30_000,
	});
}
