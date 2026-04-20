import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type Tier = "starter" | "pro" | "institutional";

export interface AuthUser {
	id: string;
	email: string;
	name: string | null;
	picture: string | null;
}

export interface AuthSubscription {
	tier: Tier;
	status: "active" | "expired" | "cancelled" | "pending";
	expires_at: string | null;
}

export type AuthState =
	| { status: "loading" }
	| { status: "unauth" }
	| { status: "auth"; user: AuthUser; subscription: AuthSubscription | null };

interface AuthContextValue {
	state: AuthState;
	refresh: () => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TIER_ORDER: Record<Tier, number> = { starter: 1, pro: 2, institutional: 3 };

export function tierMeets(have: Tier | null | undefined, min: Tier): boolean {
	if (!have) return false;
	return TIER_ORDER[have] >= TIER_ORDER[min];
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<AuthState>({ status: "loading" });

	const refresh = useCallback(async () => {
		try {
			const res = await fetch("/api/auth/me", { credentials: "include" });
			if (!res.ok) {
				setState({ status: "unauth" });
				return;
			}
			const data = (await res.json()) as {
				authenticated: boolean;
				user?: AuthUser;
				subscription?: AuthSubscription | null;
			};
			if (data.authenticated && data.user) {
				setState({
					status: "auth",
					user: data.user,
					subscription: data.subscription ?? null,
				});
			} else {
				setState({ status: "unauth" });
			}
		} catch {
			setState({ status: "unauth" });
		}
	}, []);

	const logout = useCallback(async () => {
		await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "include",
			headers: { "X-Requested-With": "terminal" },
		});
		setState({ status: "unauth" });
	}, []);

	useEffect(() => {
		refresh();
		const id = setInterval(refresh, 60_000);
		return () => clearInterval(id);
	}, [refresh]);

	return <AuthContext.Provider value={{ state, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
	return ctx;
}

export function useHasTier(min: Tier): boolean {
	const { state } = useAuth();
	if (state.status !== "auth") return false;
	return tierMeets(state.subscription?.tier, min);
}

export function loginWithGoogle(): void {
	window.location.href = "/api/auth/login";
}
