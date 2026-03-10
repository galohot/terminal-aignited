export function Skeleton({ className = "" }: { className?: string }) {
	return <div className={`animate-pulse rounded bg-t-surface ${className}`} />;
}

const PANEL_KEYS = ["p0", "p1", "p2", "p3", "p4", "p5"];
const ROW_KEYS = ["r0", "r1", "r2", "r3", "r4"];

export function MarketGridSkeleton() {
	return (
		<div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 xl:grid-cols-[1.35fr_0.95fr]">
			<div className="rounded-[28px] border border-t-border bg-t-surface p-6">
				<Skeleton className="mb-4 h-6 w-40" />
				<Skeleton className="mb-3 h-12 w-full max-w-2xl" />
				<Skeleton className="mb-6 h-10 w-full max-w-xl" />
				<div className="grid gap-3 sm:grid-cols-3">
					{ROW_KEYS.slice(0, 3).map((rk) => (
						<Skeleton key={rk} className="h-28 w-full rounded-[24px]" />
					))}
				</div>
			</div>
			<div className="grid gap-4">
				{PANEL_KEYS.slice(0, 2).map((pk) => (
					<div key={pk} className="rounded-[24px] border border-t-border bg-t-surface p-4">
						<Skeleton className="mb-3 h-4 w-32" />
						{ROW_KEYS.slice(0, 4).map((rk) => (
							<Skeleton key={rk} className="mb-2 h-16 w-full rounded-2xl" />
						))}
					</div>
				))}
			</div>
		</div>
	);
}
