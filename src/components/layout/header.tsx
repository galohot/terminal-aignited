import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { CommandBar } from "../search/command-bar";

const NAV_LINKS = [
	{ to: "/", label: "Home" },
	{ to: "/idx", label: "IDX" },
	{ to: "/idx/screener", label: "Screener" },
	{ to: "/idx/insiders", label: "Insiders" },
	{ to: "/idx/entities", label: "Power Map" },
	{ to: "/watchlist", label: "Watchlist" },
	{ to: "/charts", label: "Charts" },
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

	// Close mobile menu on navigation
	// biome-ignore lint/correctness/useExhaustiveDependencies: close on route change
	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	// Prevent body scroll when menu open
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
			<header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,24,23,0.98),rgba(10,14,14,0.96))] px-3 sm:gap-4 sm:px-4">
				{/* Mobile menu button */}
				<button
					type="button"
					onClick={() => setMobileOpen(!mobileOpen)}
					className="flex h-8 w-8 items-center justify-center rounded-lg text-t-text-muted transition-colors hover:bg-white/10 hover:text-white sm:hidden"
					aria-label="Toggle menu"
				>
					{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</button>

				<Link to="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
					<span className="rounded-md border border-t-amber/40 bg-t-amber/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-t-amber">
						AI
					</span>
					<div className="leading-tight">
						<div className="font-mono text-sm font-semibold tracking-[0.24em] text-white">
							AIGNITED
						</div>
						<div className="hidden text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:block">
							Terminal
						</div>
					</div>
				</Link>

				{/* Desktop nav */}
				<nav className="hidden items-center gap-1 sm:flex">
					{NAV_LINKS.filter(
						(l) => !["/idx/screener", "/idx/insiders", "/idx/entities"].includes(l.to),
					).map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className={clsx(
								"rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors",
								isActive(location.pathname, link.to)
									? "bg-white text-black"
									: "text-t-text-muted hover:bg-white/8 hover:text-white",
							)}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<CommandBar />

				<div className="hidden shrink-0 text-right font-mono sm:block">
					<div className="text-xs text-white">{time.jakarta} WIB</div>
					<div className="text-[10px] uppercase tracking-[0.2em] text-t-text-muted">
						{time.utc} UTC
					</div>
				</div>
			</header>

			{/* Mobile menu overlay */}
			{mobileOpen && (
				<>
					{/* Backdrop */}
					<button
						type="button"
						className="animate-fade-in fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
						aria-label="Close menu"
					/>

					{/* Slide-in menu */}
					<nav className="animate-slide-in-left fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#0c1211] pt-4 shadow-2xl">
						{/* Logo area */}
						<div className="mb-4 flex items-center justify-between px-4">
							<div className="flex items-center gap-2">
								<span className="rounded-md border border-t-amber/40 bg-t-amber/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-t-amber">
									AI
								</span>
								<span className="font-mono text-sm font-semibold tracking-[0.24em] text-white">
									AIGNITED
								</span>
							</div>
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-t-text-muted transition-colors hover:bg-white/10 hover:text-white"
								aria-label="Close menu"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* Nav links */}
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
											"flex items-center rounded-lg px-3 py-2.5 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
											isSubpage && "ml-4 text-[11px]",
											active
												? "bg-white/[0.08] text-white"
												: "text-t-text-muted hover:bg-white/[0.04] hover:text-white",
										)}
									>
										{active && (
											<span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-t-amber" />
										)}
										{link.label}
									</Link>
								);
							})}
						</div>

						{/* Time */}
						<div className="border-t border-white/[0.06] px-4 py-3 font-mono text-xs text-t-text-muted">
							<div className="text-white">{time.jakarta} WIB</div>
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
