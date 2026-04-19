export function ChartContainer({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-[18px] border border-rule bg-card p-4">
			<h3 className="font-mono text-[13px] font-semibold tracking-tight text-ink">{title}</h3>
			{subtitle && <p className="mt-0.5 text-[11px] text-ink-4">{subtitle}</p>}
			<div className="mt-3">{children}</div>
		</div>
	);
}
