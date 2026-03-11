import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { InsiderResults } from "../components/idx/insider-results";
import { Skeleton } from "../components/ui/loading";
import { useIdxInsiderSearch } from "../hooks/use-idx-insiders";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";

export function IdxInsidersPage() {
	usePageTitle("Insider Network");
	const [searchParams, setSearchParams] = useSearchParams();
	const initialName = searchParams.get("name") ?? "";
	const [search, setSearch] = useState(initialName);
	const [debouncedSearch, setDebouncedSearch] = useState(initialName);
	const searchRef = useRef<HTMLInputElement>(null);

	// Debounce search and sync to URL
	useEffect(() => {
		const id = setTimeout(() => {
			setDebouncedSearch(search);
			if (search) {
				setSearchParams({ name: search }, { replace: true });
			} else {
				setSearchParams({}, { replace: true });
			}
		}, 300);
		return () => clearTimeout(id);
	}, [search, setSearchParams]);

	const { data, isLoading, error } = useIdxInsiderSearch(debouncedSearch);

	// Keyboard: / to focus search
	useKeyboardShortcut("/", () => {
		searchRef.current?.focus();
	}, []);

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">
					Insider Network
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Search any person or entity to see all their positions across IDX-listed companies.
				</p>
			</div>

			<div className="relative mb-4 max-w-lg">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t-text-muted" />
				<input
					ref={searchRef}
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name... ( / )"
					className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 font-mono text-sm text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50 focus:bg-white/[0.06]"
				/>
			</div>

			{!debouncedSearch ? (
				<div className="rounded-2xl border border-dashed border-t-border p-12 text-center">
					<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
						Cross-Company Search
					</div>
					<p className="mt-3 text-sm text-t-text-secondary">
						Enter a name to find all director, commissioner, and shareholder positions across the
						entire IDX.
					</p>
				</div>
			) : isLoading ? (
				<Skeleton className="h-[300px] w-full rounded-xl" />
			) : error ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
					Failed to search insiders.
				</div>
			) : (
				<>
					<div className="mb-3 font-mono text-xs text-t-text-muted">
						Found {data?.total ?? 0} position{(data?.total ?? 0) === 1 ? "" : "s"} for "
						{debouncedSearch}"
					</div>
					<InsiderResults results={data?.results ?? []} />
				</>
			)}
		</div>
	);
}
