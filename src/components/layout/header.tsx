import { clsx } from "clsx";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../../contexts/auth";
import { HeaderAuth, MobileAuthBlock } from "../auth/header-auth";
import { CommandBar } from "../search/command-bar";

type NavLink = { to: string; label: string };
type NavItem =
	| { type: "link"; to: string; label: string }
	| { type: "group"; label: string; primaryTo: string; items: NavLink[] };

const AUTHED_NAV: NavItem[] = [
	{ type: "link", to: "/", label: "Desk" },
	{
		type: "group",
		label: "IDX",
		primaryTo: "/idx",
		items: [
			{ to: "/idx", label: "Explorer" },
			{ to: "/idx/movers", label: "Movers" },
			{ to: "/idx/screener", label: "Screener" },
			{ to: "/idx/flow", label: "Flow" },
			{ to: "/idx/insiders", label: "Insiders" },
			{ to: "/idx/ownership", label: "Ownership" },
			{ to: "/idx/entities", label: "Power Map" },
			{ to: "/idx/macro", label: "Macro" },
		],
	},
	{
		type: "group",
		label: "Research",
		primaryTo: "/research",
		items: [
			{ to: "/research", label: "Articles" },
			{ to: "/signals", label: "Signals" },
		],
	},
	{ type: "link", to: "/agent", label: "Agent" },
	{
		type: "group",
		label: "Portfolio",
		primaryTo: "/portfolio",
		items: [
			{ to: "/portfolio", label: "Overview" },
			{ to: "/watchlist", label: "Watchlist" },
			{ to: "/portfolio/analytics", label: "Analytics" },
		],
	},
	{ type: "link", to: "/charts", label: "Charts" },
];

const PUBLIC_NAV: NavItem[] = [
	{ type: "link", to: "/research", label: "Research" },
	{ type: "link", to: "/pricing", label: "Pricing" },
];

function isActive(pathname: string, to: string): boolean {
	if (to === "/") return pathname === "/";
	return pathname === to || pathname.startsWith(`${to}/`);
}

function groupActive(pathname: string, item: NavItem): boolean {
	if (item.type === "link") return isActive(pathname, item.to);
	return item.items.some((sub) => isActive(pathname, sub.to));
}

export function Header() {
	const location = useLocation();
	const { state } = useAuth();
	const [time, setTime] = useState(() => formatDeskTimes());
	const [mobileOpen, setMobileOpen] = useState(false);

	const isAuthed = state.status === "auth";
	const nav = isAuthed ? AUTHED_NAV : PUBLIC_NAV;

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

				<nav className="hidden items-center gap-1 lg:flex">
					{nav.map((item) => {
						if (item.type === "link") {
							const active = isActive(location.pathname, item.to);
							return <NavPill key={item.to} to={item.to} label={item.label} active={active} />;
						}
						return (
							<NavDropdown
								key={item.label}
								label={item.label}
								primaryTo={item.primaryTo}
								items={item.items}
								active={groupActive(location.pathname, item)}
								pathname={location.pathname}
							/>
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

				<div className="hidden sm:block">
					<HeaderAuth />
				</div>
			</header>

			{mobileOpen && (
				<>
					<button
						type="button"
						className="animate-fade-in fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
						aria-label="Close menu"
					/>

					<nav className="animate-slide-in-left fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-rule border-r bg-card pt-4 shadow-2xl">
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
							{nav.map((item) => {
								if (item.type === "link") {
									const active = isActive(location.pathname, item.to);
									return (
										<MobileLink
											key={item.to}
											to={item.to}
											label={item.label}
											active={active}
										/>
									);
								}
								return (
									<MobileGroup
										key={item.label}
										label={item.label}
										items={item.items}
										pathname={location.pathname}
										defaultOpen={groupActive(location.pathname, item)}
									/>
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

function NavPill({ to, label, active }: { to: string; label: string; active: boolean }) {
	return (
		<Link
			to={to}
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
			{label}
		</Link>
	);
}

function NavDropdown({
	label,
	primaryTo,
	items,
	active,
	pathname,
}: {
	label: string;
	primaryTo: string;
	items: NavLink[];
	active: boolean;
	pathname: string;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<number | null>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const cancelClose = () => {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	};
	const scheduleClose = () => {
		cancelClose();
		closeTimer.current = window.setTimeout(() => setOpen(false), 140);
	};

	return (
		<div
			ref={ref}
			className="relative"
			onMouseEnter={() => {
				cancelClose();
				setOpen(true);
			}}
			onMouseLeave={scheduleClose}
		>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={clsx(
					"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] uppercase transition-all",
					active
						? "border-rule bg-card text-ink shadow-[0_1px_2px_rgba(20,23,53,0.06)]"
						: "border-transparent text-ink-3 hover:bg-paper-2 hover:text-ink",
				)}
				aria-haspopup="menu"
				aria-expanded={open}
			>
				{active && (
					<span
						className="inline-block h-[5px] w-[5px] rounded-full bg-ember-500"
						style={{ boxShadow: "0 0 8px rgba(232,78,0,0.4)" }}
					/>
				)}
				{label}
				<ChevronDown
					className={clsx("h-3 w-3 transition-transform", open && "rotate-180")}
				/>
			</button>

			{open && (
				<div
					className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[200px] rounded-xl border border-rule bg-card p-1 shadow-[0_10px_30px_rgba(20,23,53,0.12)]"
					role="menu"
				>
					<Link
						to={primaryTo}
						onClick={() => setOpen(false)}
						className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] text-ember-600 tracking-[0.18em] uppercase hover:bg-paper-2"
					>
						<span className="inline-block h-1 w-1 rounded-full bg-ember-500" />
						{label} home
					</Link>
					<div className="my-1 h-px bg-rule" />
					{items
						.filter((sub) => sub.to !== primaryTo)
						.map((sub) => (
							<Link
								key={sub.to}
								to={sub.to}
								onClick={() => setOpen(false)}
								className="block rounded-lg px-3 py-2 text-[13px] text-ink-2 hover:bg-paper-2 hover:text-ink"
							>
								{sub.label}
							</Link>
						))}
				</div>
			)}
		</div>
	);
}

function MobileLink({ to, label, active }: { to: string; label: string; active: boolean }) {
	return (
		<Link
			to={to}
			className={clsx(
				"flex items-center rounded-lg px-3 py-3 font-mono text-xs tracking-[0.18em] uppercase transition-colors",
				active
					? "bg-paper-2 text-ink"
					: "text-ink-3 hover:bg-paper-2/70 hover:text-ink",
			)}
		>
			{active && (
				<span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ember-500" />
			)}
			{label}
		</Link>
	);
}

function MobileGroup({
	label,
	items,
	pathname,
	defaultOpen,
}: {
	label: string;
	items: NavLink[];
	pathname: string;
	defaultOpen: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="mb-0.5">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between rounded-lg px-3 py-3 font-mono text-ink-3 text-xs tracking-[0.18em] uppercase transition-colors hover:bg-paper-2/70 hover:text-ink"
			>
				<span className="flex items-center gap-2">{label}</span>
				<ChevronDown
					className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
				/>
			</button>
			{open && (
				<div className="mt-0.5 ml-2 border-rule border-l pl-2">
					{items.map((sub) => {
						const active = isActive(pathname, sub.to);
						return (
							<Link
								key={sub.to}
								to={sub.to}
								className={clsx(
									"flex items-center rounded-lg px-3 py-2.5 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors",
									active
										? "bg-paper-2 text-ink"
										: "text-ink-3 hover:bg-paper-2/70 hover:text-ink",
								)}
							>
								{active && (
									<span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ember-500" />
								)}
								{sub.label}
							</Link>
						);
					})}
				</div>
			)}
		</div>
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
