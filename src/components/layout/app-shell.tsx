import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { usePageTracking } from "../../hooks/use-analytics";
import { useGlobalKeyboard, useKeyboardShortcut } from "../../hooks/use-keyboard";
import { useRealtime } from "../../hooks/use-realtime";
import { Disclaimer, useDisclaimer } from "../ui/disclaimer";
import { KeyboardHelp } from "../ui/keyboard-help";
import { Header } from "./header";
import { StatusBar } from "./status-bar";

export function AppShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const [showHelp, setShowHelp] = useState(false);
	const { accepted: disclaimerAccepted, accept: acceptDisclaimer } = useDisclaimer();

	useGlobalKeyboard();
	useRealtime();
	usePageTracking();

	useKeyboardShortcut("1", () => navigate("/"), [navigate]);
	useKeyboardShortcut("2", () => navigate("/watchlist"), [navigate]);
	useKeyboardShortcut("shift+?", () => setShowHelp((v) => !v), []);

	return (
		<div className="flex h-screen flex-col bg-t-bg text-t-text">
			<Header />
			<main className="flex-1 overflow-auto">{children}</main>
			<StatusBar />
			{showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
			{!disclaimerAccepted && <Disclaimer onAccept={acceptDisclaimer} />}
		</div>
	);
}
