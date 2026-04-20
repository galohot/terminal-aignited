import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PatternCard } from "../signals/pattern-card";

interface PatternsStripProps {
	symbol: string;
}

/**
 * Technical pattern cards for a stock page.
 * IDX-only — returns null for non-.JK symbols or when no patterns clear
 * the 0.5 confidence floor.
 */
export function PatternsStrip({ symbol }: PatternsStripProps) {
	const isJK = symbol.endsWith(".JK");
	const kode = isJK ? symbol.replace(".JK", "") : "";
	const q = useQuery({
		queryKey: ["idx-patterns", kode],
		queryFn: () => api.idxPatterns(kode),
		enabled: isJK && kode.length > 0,
		staleTime: 5 * 60_000,
		retry: false,
	});

	if (!isJK || q.isLoading || q.isError || !q.data) return null;
	const patterns = q.data.patterns.filter((p) => p.confidence >= 0.5);
	if (patterns.length === 0) return null;

	return (
		<div className="mx-4 mt-3">
			<div className="mb-2 flex items-center gap-2">
				<span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ember-600">
					Technical Patterns
				</span>
				<span className="font-mono text-[10px] text-ink-4">{patterns.length} detected</span>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{patterns.map((p) => (
					<PatternCard key={p.name} ticker={kode} pattern={p} />
				))}
			</div>
		</div>
	);
}
