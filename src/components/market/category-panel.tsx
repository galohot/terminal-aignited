import type { Quote } from "../../types/market";
import { TickerCard } from "./ticker-card";

interface CategoryPanelProps {
	title: string;
	quotes: Quote[];
}

export function CategoryPanel({ title, quotes }: CategoryPanelProps) {
	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					{title}
				</h3>
			</div>
			<div>
				{quotes.map((q) => (
					<TickerCard key={q.symbol} quote={q} />
				))}
			</div>
		</div>
	);
}

interface IndexPanelProps {
	indices: {
		indonesia: Quote[];
		us: Quote[];
		europe: Quote[];
		asia_pacific: Quote[];
	};
}

const regionLabels: Record<string, string> = {
	indonesia: "Indonesia",
	us: "United States",
	europe: "Europe",
	asia_pacific: "Asia Pacific",
};

export function IndexPanel({ indices }: IndexPanelProps) {
	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					Indices
				</h3>
			</div>
			{(["indonesia", "us", "europe", "asia_pacific"] as const).map((region) => {
				const quotes = indices[region];
				if (!quotes.length) return null;
				return (
					<div key={region}>
						<div className="border-b border-t-border bg-t-bg px-3 py-1">
							<span className="text-[10px] font-medium uppercase tracking-wider text-t-text-muted">
								{regionLabels[region]}
							</span>
						</div>
						{quotes.map((q) => (
							<TickerCard key={q.symbol} quote={q} />
						))}
					</div>
				);
			})}
		</div>
	);
}
