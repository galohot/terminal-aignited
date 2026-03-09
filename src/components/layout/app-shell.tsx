import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { useGlobalKeyboard, useKeyboardShortcut } from "../../hooks/use-keyboard";
import { KeyboardHelp } from "../ui/keyboard-help";
import { Header } from "./header";
import { StatusBar } from "./status-bar";

export function AppShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const [showHelp, setShowHelp] = useState(false);

	useGlobalKeyboard();

	useKeyboardShortcut("1", () => navigate("/"), [navigate]);
	useKeyboardShortcut("2", () => navigate("/watchlist"), [navigate]);
	useKeyboardShortcut("shift+?", () => setShowHelp((v) => !v), []);

	return (
		<div className="flex h-screen flex-col bg-t-bg text-t-text">
			<Header />
			<main className="flex-1 overflow-auto">{children}</main>
			<StatusBar />
			{showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
		</div>
	);
}
