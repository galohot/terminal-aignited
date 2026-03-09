import type { ReactNode } from "react";
import { Header } from "./header";
import { StatusBar } from "./status-bar";

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-screen flex-col bg-t-bg text-t-text">
			<Header />
			<main className="flex-1 overflow-auto">{children}</main>
			<StatusBar />
		</div>
	);
}
