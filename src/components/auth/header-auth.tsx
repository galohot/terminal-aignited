import { clsx } from "clsx";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { loginWithGoogle, type Tier, useAuth } from "../../contexts/auth";

function tierLabel(tier: Tier): string {
	return tier === "starter" ? "Starter" : tier === "pro" ? "Pro" : "Institutional";
}

function initials(name: string | null, email: string): string {
	const src = (name && name.trim()) || email;
	const parts = src.split(/[\s@.]+/).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return src.slice(0, 2).toUpperCase();
}

// Mobile drawer block — same actions as the desktop avatar dropdown,
// inlined into the slide-out so phones don't have to chase a 36px avatar.
export function MobileAuthBlock({ onAction }: { onAction?: () => void }) {
	const { state, logout } = useAuth();
	const close = () => onAction?.();

	if (state.status === "loading") {
		return <div className="h-14 animate-pulse rounded-xl bg-paper-2" aria-hidden />;
	}

	if (state.status === "unauth") {
		return (
			<button
				type="button"
				onClick={() => {
					close();
					loginWithGoogle();
				}}
				className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-mono text-[12px] text-paper tracking-[0.22em] uppercase transition-colors hover:bg-ink-2"
			>
				<User className="h-4 w-4" />
				Sign in with Google
			</button>
		);
	}

	const { user, subscription } = state;
	const tier = subscription?.tier ?? null;

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-3 rounded-xl border border-rule bg-paper-2/60 px-3 py-2.5">
				<div
					className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full p-[2px]"
					style={{
						background:
							"conic-gradient(from 200deg, #ff8a2a, #ffb020, #1d5fc9, #ff8a2a)",
					}}
				>
					<div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-card font-extrabold text-[12px] text-ink">
						{user.picture ? (
							<img
								src={user.picture}
								alt=""
								className="h-full w-full object-cover"
								referrerPolicy="no-referrer"
							/>
						) : (
							initials(user.name, user.email)
						)}
					</div>
				</div>
				<div className="min-w-0 flex-1">
					<div className="truncate font-semibold text-[13px] text-ink">
						{user.name || user.email.split("@")[0]}
					</div>
					<div className="truncate text-[11px] text-ink-4">{user.email}</div>
					<div className="mt-1">
						{tier && subscription?.status === "active" ? (
							<span
								className={clsx(
									"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]",
									tier === "institutional"
										? "bg-ember-100 text-ember-700"
										: tier === "pro"
											? "bg-[rgba(23,165,104,0.12)] text-pos"
											: "bg-paper-2 text-ink-3",
								)}
							>
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
								{tierLabel(tier)}
							</span>
						) : (
							<Link
								to="/pricing"
								onClick={close}
								className="inline-flex items-center rounded-full bg-ember-500 px-2 py-0.5 font-mono text-[9px] text-white uppercase tracking-[0.16em] hover:bg-ember-600"
							>
								Subscribe
							</Link>
						)}
					</div>
				</div>
			</div>

			<Link
				to="/portfolio"
				onClick={close}
				className="block rounded-lg px-3 py-2.5 font-mono text-[11px] text-ink-2 tracking-[0.18em] uppercase hover:bg-paper-2 hover:text-ink"
			>
				Portfolio
			</Link>
			<Link
				to="/pricing"
				onClick={close}
				className="block rounded-lg px-3 py-2.5 font-mono text-[11px] text-ink-2 tracking-[0.18em] uppercase hover:bg-paper-2 hover:text-ink"
			>
				Manage plan
			</Link>
			<button
				type="button"
				onClick={async () => {
					close();
					await logout();
				}}
				className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-mono text-[11px] text-ink-2 tracking-[0.18em] uppercase hover:bg-paper-2 hover:text-ink"
			>
				<LogOut className="h-3.5 w-3.5" />
				Sign out
			</button>
		</div>
	);
}

export function HeaderAuth() {
	const { state, logout } = useAuth();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	if (state.status === "loading") {
		return (
			<div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-paper-2" aria-hidden />
		);
	}

	if (state.status === "unauth") {
		return (
			<button
				type="button"
				onClick={loginWithGoogle}
				className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-3.5 py-2 font-mono text-[11px] text-paper tracking-[0.2em] uppercase transition-all hover:-translate-y-[1px] hover:bg-ink-2"
				style={{ boxShadow: "0 1px 2px rgba(20,23,53,0.12)" }}
			>
				<User className="h-3.5 w-3.5" />
				Sign in
			</button>
		);
	}

	const { user, subscription } = state;
	const tier = subscription?.tier ?? null;

	return (
		<div ref={ref} className="relative shrink-0">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 rounded-full p-[2px] transition-transform hover:scale-[1.03]"
				style={{
					background: "conic-gradient(from 200deg, #ff8a2a, #ffb020, #1d5fc9, #ff8a2a)",
				}}
				aria-label="Account menu"
				aria-expanded={open}
			>
				<div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-card font-extrabold text-[12px] text-ink">
					{user.picture ? (
						<img
							src={user.picture}
							alt=""
							className="h-full w-full object-cover"
							referrerPolicy="no-referrer"
						/>
					) : (
						initials(user.name, user.email)
					)}
				</div>
			</button>

			{open && (
				<div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-rule bg-card p-1 shadow-[0_10px_30px_rgba(20,23,53,0.12)]">
					<div className="border-rule border-b px-3 py-2.5">
						<div className="truncate font-semibold text-[13px] text-ink">
							{user.name || user.email.split("@")[0]}
						</div>
						<div className="truncate text-[11px] text-ink-4">{user.email}</div>
						<div className="mt-2">
							{tier && subscription?.status === "active" ? (
								<span
									className={clsx(
										"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]",
										tier === "institutional"
											? "bg-ember-100 text-ember-700"
											: tier === "pro"
												? "bg-[rgba(23,165,104,0.12)] text-pos"
												: "bg-paper-2 text-ink-3",
									)}
								>
									<span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
									{tierLabel(tier)}
								</span>
							) : (
								<Link
									to="/pricing"
									onClick={() => setOpen(false)}
									className="inline-flex items-center rounded-full bg-ember-500 px-2 py-0.5 font-mono text-[9px] text-white uppercase tracking-[0.16em] hover:bg-ember-600"
								>
									Subscribe
								</Link>
							)}
						</div>
					</div>
					<Link
						to="/portfolio"
						onClick={() => setOpen(false)}
						className="block rounded px-3 py-2 text-[13px] text-ink-2 hover:bg-paper-2 hover:text-ink"
					>
						Portfolio
					</Link>
					<Link
						to="/pricing"
						onClick={() => setOpen(false)}
						className="block rounded px-3 py-2 text-[13px] text-ink-2 hover:bg-paper-2 hover:text-ink"
					>
						Manage plan
					</Link>
					<button
						type="button"
						onClick={async () => {
							setOpen(false);
							await logout();
						}}
						className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-paper-2 hover:text-ink"
					>
						<LogOut className="h-3.5 w-3.5" />
						Sign out
					</button>
				</div>
			)}
		</div>
	);
}
