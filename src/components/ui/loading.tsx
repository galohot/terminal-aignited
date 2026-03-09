export function Skeleton({ className = "" }: { className?: string }) {
	return <div className={`animate-pulse rounded bg-t-surface ${className}`} />;
}

const PANEL_KEYS = ["p0", "p1", "p2", "p3", "p4", "p5"];
const ROW_KEYS = ["r0", "r1", "r2", "r3", "r4"];

export function MarketGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
			{PANEL_KEYS.map((pk) => (
				<div key={pk} className="rounded border border-t-border bg-t-surface p-4">
					<Skeleton className="mb-3 h-4 w-24" />
					{ROW_KEYS.map((rk) => (
						<Skeleton key={rk} className="mb-2 h-6 w-full" />
					))}
				</div>
			))}
		</div>
	);
}
