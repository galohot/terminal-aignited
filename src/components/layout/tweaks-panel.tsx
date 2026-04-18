import { Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Accent = "ember" | "blue" | "spark";
type Density = "comfortable" | "compact";
type Skin = "full" | "minimal";

interface Tweaks {
	accent: Accent;
	density: Density;
	skin: Skin;
}

const STORAGE_KEY = "aig:tweaks:v1";
const DEFAULTS: Tweaks = { accent: "ember", density: "comfortable", skin: "full" };

function loadTweaks(): Tweaks {
	if (typeof window === "undefined") return DEFAULTS;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULTS;
		const parsed = JSON.parse(raw) as Partial<Tweaks>;
		return {
			accent: (parsed.accent as Accent) ?? DEFAULTS.accent,
			density: (parsed.density as Density) ?? DEFAULTS.density,
			skin: (parsed.skin as Skin) ?? DEFAULTS.skin,
		};
	} catch {
		return DEFAULTS;
	}
}

function applyTweaks(t: Tweaks) {
	if (typeof document === "undefined") return;
	document.body.dataset.accent = t.accent;
	document.body.dataset.density = t.density;
	document.body.dataset.skin = t.skin;
}

export function useTweaks() {
	const [tweaks, setTweaks] = useState<Tweaks>(() => loadTweaks());

	useEffect(() => {
		applyTweaks(tweaks);
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
		} catch {}
	}, [tweaks]);

	return [tweaks, setTweaks] as const;
}

export function TweaksPanel({
	open,
	onClose,
	tweaks,
	onChange,
}: {
	open: boolean;
	onClose: () => void;
	tweaks: Tweaks;
	onChange: (next: Tweaks) => void;
}) {
	if (!open) return null;

	return (
		<div
			role="dialog"
			aria-label="Tweaks"
			className="animate-fade-in fixed right-4 bottom-12 z-50 w-[280px] rounded-[18px] border border-aig-navy-4/70 bg-[linear-gradient(180deg,rgba(14,21,48,0.97),rgba(8,12,28,0.97))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md"
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close tweaks"
				className="absolute top-2.5 right-2.5 text-aig-text-4 transition-colors hover:text-aig-text"
			>
				<X className="h-4 w-4" />
			</button>

			<h5 className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-aig-ember-300 uppercase">
				<Settings2 className="h-3.5 w-3.5" /> Tweaks
			</h5>

			<TweakRow
				label="Accent"
				values={[
					["ember", "Ember"],
					["blue", "Blue"],
					["spark", "Spark"],
				]}
				current={tweaks.accent}
				onPick={(v) => onChange({ ...tweaks, accent: v as Accent })}
			/>
			<TweakRow
				label="Density"
				values={[
					["comfortable", "Comfort"],
					["compact", "Compact"],
				]}
				current={tweaks.density}
				onPick={(v) => onChange({ ...tweaks, density: v as Density })}
			/>
			<TweakRow
				label="Skin"
				values={[
					["full", "Full"],
					["minimal", "Minimal"],
				]}
				current={tweaks.skin}
				onPick={(v) => onChange({ ...tweaks, skin: v as Skin })}
			/>
		</div>
	);
}

function TweakRow({
	label,
	values,
	current,
	onPick,
}: {
	label: string;
	values: Array<[string, string]>;
	current: string;
	onPick: (v: string) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2 border-aig-navy-3/60 border-t py-2 first:border-t-0">
			<span className="text-sm text-aig-text-2">{label}</span>
			<div className="flex gap-1">
				{values.map(([v, lbl]) => {
					const active = v === current;
					return (
						<button
							key={v}
							type="button"
							onClick={() => onPick(v)}
							className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors ${
								active
									? "border-aig-ember-500 bg-aig-ember-500 font-bold text-[#1a0b00]"
									: "border-aig-navy-3/60 bg-white/[0.03] text-aig-text-3 hover:text-aig-text"
							}`}
						>
							{lbl}
						</button>
					);
				})}
			</div>
		</div>
	);
}
