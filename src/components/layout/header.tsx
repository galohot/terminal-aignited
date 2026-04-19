import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { HeaderAuth, MobileAuthBlock } from "../auth/header-auth";
import { CommandBar } from "../search/command-bar";

// Keep mobile drawer in sync with components/idx/idx-nav.tsx → IDX_LINKS.
const IDX_SUBPAGES = [
	"/idx/movers",
	"/idx/screener",
	"/idx/flow",
	"/idx/insiders",
	"/idx/ownership",
	"/idx/entities",
	"/idx/macro",
] as const;

const NAV_LINKS = [
	{ to: "/", label: "Desk" },
	{ to: "/idx", label: "IDX" },
	{ to: "/idx/movers", label: "Movers" },
	{ to: "/idx/screener", label: "Screener" },
	{ to: "/idx/flow", label: "Flow" },
	{ to: "/idx/insiders", label: "Insiders" },
	{ to: "/idx/ownership", label: "Ownership" },
	{ to: "/idx/entities", label: "Power Map" },
	{ to: "/idx/macro", label: "Macro" },
	{ to: "/watchlist", label: "Watchlist" },
	{ to: "/charts", label: "Charts" },
	{ to: "/signals", label: "Signals" },
	{ to: "/research", label: "Research" },
	{ to: "/agent", label: "Agent" },
	{ to: "/portfolio", label: "Portfolio" },
	{ to: "/pricing", label: "Pricing" },
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
			<header className="relative z-40 flex h-[72px] shrink-0 items-center gap-4 border-rule border-b bg-card/85 px-3 backdrop-blur-md sm:px-5">
				{/* Mobile menu button */}
				<button
					type="button"
					onClick={() => setMobileOpen(!mobileOpen)}
					className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink sm:hidden"
					aria-label="Toggle menu"
				>
					{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</button>

				<Link to="/" className="flex shrink-0 items-center gap-3">
					<span
						className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-rule bg-card"
						style={{
							boxShadow:
								"0 0 0 1px rgba(232,78,0,0.08), inset 0 0 20px rgba(255,138,42,0.08)",
						}}
					>
						<img
							src="/logo-mark.png"
							alt="aignited"
							className="h-7 w-7 object-contain drop-shadow-[0_2px_6px_rgba(232,78,0,0.25)]"
						/>
					</span>
					<div className="hidden leading-tight sm:block">
						<div
							className="font-extrabold text-[22px] text-ink tracking-[-0.01em]"
							style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
						>
							a
							<i
								className="italic"
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
						<div className="mt-0.5 font-mono text-[10px] text-ember-600 uppercase tracking-[0.3em]">
							Terminal · Desk
						</div>
					</div>
				</Link>

				{/* Desktop nav — IDX subpages live inside the IDX subnav, omit here */}
				<nav className="hidden items-center gap-1 lg:flex">
					{NAV_LINKS.filter((l) => !IDX_SUBPAGES.includes(l.to as (typeof IDX_SUBPAGES)[number])).map((link) => {
						const active = isActive(location.pathname, link.to);
						return (
							<Link
								key={link.to}
								to={link.to}
								className={clsx(
									"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] uppercase transition-all",
									active
										? "border-rule bg-card text-ink shadow-[0_1px_2px_rgba(20,23,53,0.06)]"
										: "border-transparent text-ink-3 hover:bg-paper-2 hover:text-ink",
								)}
							>
								{active && (
									<span
										className="inline-block h-[5px] w-[5px] rounded-full bg-ember-500"
										style={{ boxShadow: "0 0 8px rgba(232,78,0,0.4)" }}
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
						<div className="text-[13px] text-ink tracking-[0.04em]">{time.jakarta}</div>
						<div className="text-[10px] text-ink-4 uppercase tracking-[0.22em]">
							Jakarta · WIB
						</div>
					</div>
					<div className="text-right">
						<div className="text-[13px] text-ink tracking-[0.04em]">{time.utc}</div>
						<div className="text-[10px] text-ink-4 uppercase tracking-[0.22em]">UTC</div>
					</div>
				</div>

				{/* Avatar dropdown — hidden on mobile (drawer hosts auth there) */}
				<div className="hidden sm:block">
					<HeaderAuth />
				</div>
			</header>

			{/* Mobile menu overlay */}
			{mobileOpen && (
				<>
					<button
						type="button"
						className="animate-fade-in fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
						aria-label="Close menu"
					/>

					<nav className="animate-slide-in-left fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-rule border-r bg-card pt-4 shadow-2xl">
						<div className="mb-4 flex items-center justify-between px-4">
							<div className="flex items-center gap-2">
								<img src="/logo-mark.png" alt="aignited" className="h-8 w-8" />
								<span className="font-mono font-semibold text-sm text-ink tracking-[0.24em]">
									AIGNITED
								</span>
							</div>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
								aria-label="Close menu"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-2 pb-2">
							{NAV_LINKS.map((link) => {
								const active = isActive(location.pathname, link.to);
								const isSubpage = IDX_SUBPAGES.includes(
									link.to as (typeof IDX_SUBPAGES)[number],
								);

								return (
									<Link
										key={link.to}
										to={link.to}
										className={clsx(
											"flex items-center rounded-lg px-3 py-3 font-mono text-xs tracking-[0.18em] uppercase transition-colors",
											isSubpage && "ml-4 text-[11px]",
											active
												? "bg-paper-2 text-ink"
												: "text-ink-3 hover:bg-paper-2/70 hover:text-ink",
										)}
									>
										{active && (
											<span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ember-500" />
										)}
										{link.label}
									</Link>
								);
							})}
						</div>

						<div className="border-rule border-t px-3 py-3">
							<MobileAuthBlock onAction={() => setMobileOpen(false)} />
							<div className="mt-3 flex items-center justify-between border-rule border-t pt-3 font-mono text-ink-3 text-xs">
								<div>
									<div className="text-ink">{time.jakarta} WIB</div>
									<div className="text-[10px] uppercase tracking-[0.2em]">{time.utc} UTC</div>
								</div>
							</div>
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
