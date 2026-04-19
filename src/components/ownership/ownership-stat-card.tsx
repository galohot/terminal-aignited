import { useEffect, useState } from "react";

interface StatCardProps {
	label: string;
	value: number;
	suffix?: string;
	subtitle?: string;
	icon?: React.ReactNode;
	color?: string;
}

export function StatCard({
	label,
	value,
	suffix,
	subtitle,
	icon,
	color = "#ff8a2a",
}: StatCardProps) {
	const [display, setDisplay] = useState(0);

	useEffect(() => {
		const duration = 1400;
		const start = performance.now();
		const step = (now: number) => {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
			setDisplay(Math.round(eased * value));
			if (progress < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}, [value]);

	return (
		<div className="relative pl-4" style={{ "--stat-color": color } as React.CSSProperties}>
			{/* Left accent bar */}
			<div
				className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
				style={{
					background: `linear-gradient(180deg, ${color}, ${color}40)`,
				}}
			/>

			{/* Label row */}
			<div className="flex items-center gap-2 mb-1">
				{icon && (
					<span style={{ color }} className="opacity-60">
						{icon}
					</span>
				)}
				<p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-4">
					{label}
				</p>
			</div>

			<p className="font-mono text-[1.75rem] font-bold leading-none tracking-tight text-ink">
				{display.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
				{suffix && <span className="ml-1 text-sm font-normal text-ink-4">{suffix}</span>}
			</p>

			{subtitle && <p className="mt-1.5 font-mono text-[11px] text-ink-4">{subtitle}</p>}
		</div>
	);
}
