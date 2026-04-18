import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { CommandBar } from "../search/command-bar";

const NAV_LINKS = [
	{ to: "/", label: "Desk" },
	{ to: "/idx", label: "IDX" },
	{ to: "/idx/screener", label: "Screener" },
	{ to: "/idx/insiders", label: "Insiders" },
	{ to: "/idx/entities", label: "Power Map" },
	{ to: "/watchlist", label: "Watchlist" },
	{ to: "/charts", label: "Charts" },
	{ to: "/signals", label: "Signals" },
] as const;

function isActive(pathname: string, to: string): boolean {
	if (to === "/") return pathname === "/";
	return pathname === to || pathname.startsWith(`${to}/`);
}

export function Header() {
	const location = useLocation();
	const [time, setTime] = useState(() => formatDeskTimes());
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		const id = setInterval(() => setTime(formatDeskTimes()), 1000);
		return () => clearInterval(id);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: close on route change
	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		if (mobileOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileOpen]);

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-4 border-aig-navy-3/60 border-b bg-[linear-gradient(180deg,rgba(14,21,48,0.9),rgba(8,12,28,0.85))] px-3 backdrop-blur-md sm:px-5">
				{/* Mobile menu button */}
				<button
					type="button"
					onClick={() => setMobileOpen(!mobileOpen)}
					className="flex h-9 w-9 items-center justify-center rounded-lg text-aig-text-3 transition-colors hover:bg-white/10 hover:text-white sm:hidden"
					aria-label="Toggle menu"
				>
					{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</button>

				<Link to="/" className="flex shrink-0 items-center gap-3">
					<span
						className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-aig-navy-4/70 bg-[radial-gradient(120%_120%_at_30%_20%,#1d2a5a_0%,#0b1024_60%)]"
						style={{
							boxShadow: "0 0 0 1px rgba(255,122,26,0.12), inset 0 0 20px rgba(255,122,26,0.08)",
						}}
					>
						<img
							src="/logo-mark.png"
							alt="aignited"
							className="h-7 w-7 object-contain drop-shadow-[0_2px_6px_rgba(255,122,26,0.35)]"
						/>
					</span>
					<div className="hidden leading-tight sm:block">
						<div className="font-extrabold text-[20px] text-aig-text tracking-[0.01em]">
							a
							<i
								className="not-italic"
								style={{
									background: "var(--aig-grad-ember)",
									WebkitBackgroundClip: "text",
									backgroundClip: "text",
									color: "transparent",
								}}
							>
								i
							</i>
							gnited
						</div>
						<div className="mt-0.5 font-mono text-[10px] text-aig-text-4 uppercase tracking-[0.3em]">
							Terminal · Desk
						</div>
					</div>
				</Link>

				{/* Desktop nav */}
				<nav className="hidden items-center gap-1 lg:flex">
					{NAV_LINKS.filter(
						(l) => !["/idx/screener", "/idx/insiders", "/idx/entities"].includes(l.to),
					).map((link) => {
						const active = isActive(location.pathname, link.to);
						return (
							<Link
								key={link.to}
								to={link.to}
								className={clsx(
									"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] uppercase transition-all",
									active
										? "border-aig-ember-500/35 bg-[linear-gradient(180deg,rgba(255,122,26,0.14),rgba(255,122,26,0.04))] text-aig-text"
										: "border-transparent text-aig-text-3 hover:bg-white/[0.06] hover:text-aig-text",
								)}
							>
								{active && (
									<span
										className="inline-block h-[5px] w-[5px] rounded-full bg-aig-ember-500"
										style={{ boxShadow: "0 0 8px var(--color-aig-ember-500)" }}
									/>
								)}
								{link.label}
							</Link>
						);
					})}
				</nav>

				<CommandBar />

				<div className="hidden shrink-0 items-center gap-4 font-mono lg:flex">
					<div className="text-right">
						<div className="text-[13px] text-aig-text tracking-[0.04em]">{time.jakarta}</div>
						<div className="text-[10px] text-aig-text-4 uppercase tracking-[0.22em]">
							Jakarta · WIB
						</div>
					</div>
					<div className="text-right">
						<div className="text-[13px] text-aig-text tracking-[0.04em]">{time.utc}</div>
						<div className="text-[10px] text-aig-text-4 uppercase tracking-[0.22em]">UTC</div>
					</div>
				</div>

				<div
					className="hidden h-9 w-9 shrink-0 place-items-center rounded-full p-[2px] sm:grid"
					style={{
						background: "conic-gradient(from 200deg, #ff7a1a, #ffc24a, #2a62c6, #ff7a1a)",
					}}
				>
					<div className="grid h-full w-full place-items-center rounded-full bg-aig-navy-2 font-extrabold text-[13px] text-aig-text">
						GH
					</div>
				</div>
			</header>

			{/* Mobile menu overlay */}
			{mobileOpen && (
				<>
					<button
						type="button"
						className="animate-fade-in fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
						aria-label="Close menu"
					/>

					<nav className="animate-slide-in-left fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-aig-navy-3/70 border-r bg-aig-navy-1 pt-4 shadow-2xl">
						<div className="mb-4 flex items-center justify-between px-4">
							<div className="flex items-center gap-2">
								<img src="/logo-mark.png" alt="aignited" className="h-8 w-8" />
								<span className="font-mono font-semibold text-sm text-white tracking-[0.24em]">
									AIGNITED
								</span>
							</div>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-aig-text-3 transition-colors hover:bg-white/10 hover:text-white"
								aria-label="Close menu"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-2">
							{NAV_LINKS.map((link) => {
								const active = isActive(location.pathname, link.to);
								const isSubpage = ["/idx/screener", "/idx/insiders", "/idx/entities"].includes(
									link.to,
								);

								return (
									<Link
										key={link.to}
										to={link.to}
										className={clsx(
											"flex items-center rounded-lg px-3 py-2.5 font-mono text-xs tracking-[0.18em] uppercase transition-colors",
											isSubpage && "ml-4 text-[11px]",
											active
												? "bg-white/[0.08] text-white"
												: "text-aig-text-3 hover:bg-white/[0.04] hover:text-white",
										)}
									>
										{active && (
											<span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-aig-ember-500" />
										)}
										{link.label}
									</Link>
								);
							})}
						</div>

						<div className="border-aig-navy-3/60 border-t px-4 py-3 font-mono text-aig-text-3 text-xs">
							<div className="text-aig-text">{time.jakarta} WIB</div>
							<div className="text-[10px] uppercase tracking-[0.2em]">{time.utc} UTC</div>
						</div>
					</nav>
				</>
			)}
		</>
	);
}

function formatDeskTimes() {
	const d = new Date();
	return {
		jakarta: new Intl.DateTimeFormat("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			timeZone: "Asia/Jakarta",
		}).format(d),
		utc: d.toISOString().slice(11, 19),
	};
}
