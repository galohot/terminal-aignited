export function Skeleton({ className = "" }: { className?: string }) {
	return <div className={`animate-pulse rounded bg-t-surface ${className}`} />;
}

export function PageLoading() {
	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<Skeleton className="mb-4 h-8 w-48" />
			<Skeleton className="mb-6 h-4 w-80" />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<Skeleton className="h-20 rounded-lg" />
				<Skeleton className="h-20 rounded-lg" />
				<Skeleton className="h-20 rounded-lg" />
				<Skeleton className="h-20 rounded-lg" />
			</div>
			<Skeleton className="mb-4 h-[300px] w-full rounded-lg" />
			<Skeleton className="h-[200px] w-full rounded-lg" />
		</div>
	);
}

const PANEL_KEYS = ["p0", "p1", "p2", "p3", "p4", "p5"];
const ROW_KEYS = ["r0", "r1", "r2", "r3", "r4"];

export function MarketGridSkeleton() {
	return (
		<div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4">
			<div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
				<div className="rounded-[28px] border border-t-border bg-t-surface p-6">
					<Skeleton className="mb-4 h-6 w-56" />
					<Skeleton className="mb-3 h-14 w-full max-w-3xl" />
					<Skeleton className="mb-6 h-12 w-full max-w-2xl" />
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{ROW_KEYS.slice(0, 4).map((rk) => (
							<Skeleton key={rk} className="h-28 w-full rounded-[24px]" />
						))}
					</div>
					<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{ROW_KEYS.slice(0, 4).map((rk) => (
							<Skeleton key={`hero-${rk}`} className="h-36 w-full rounded-[24px]" />
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
			<div className="grid gap-4 xl:grid-cols-4">
				{PANEL_KEYS.slice(0, 4).map((pk) => (
					<div key={`row-${pk}`} className="rounded-[24px] border border-t-border bg-t-surface p-4">
						<Skeleton className="mb-3 h-4 w-28" />
						{ROW_KEYS.slice(0, 4).map((rk) => (
							<Skeleton key={rk} className="mb-2 h-16 w-full rounded-2xl" />
						))}
					</div>
				))}
			</div>
			<div className="grid gap-4 xl:grid-cols-3">
				{PANEL_KEYS.slice(0, 3).map((pk) => (
					<div
						key={`summary-${pk}`}
						className="rounded-[24px] border border-t-border bg-t-surface p-4"
					>
						<Skeleton className="mb-3 h-4 w-36" />
						{ROW_KEYS.slice(0, 3).map((rk) => (
							<Skeleton key={rk} className="mb-2 h-20 w-full rounded-2xl" />
						))}
					</div>
				))}
			</div>
		</div>
	);
}
