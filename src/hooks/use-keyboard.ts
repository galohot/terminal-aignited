import { useCallback, useEffect } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

const shortcuts = new Map<string, KeyHandler>();

function buildKeyString(e: KeyboardEvent): string {
	const parts: string[] = [];
	if (e.ctrlKey || e.metaKey) parts.push("ctrl");
	if (e.shiftKey) parts.push("shift");
	if (e.altKey) parts.push("alt");
	parts.push(e.key.toLowerCase());
	return parts.join("+");
}

function isInputFocused(): boolean {
	const tag = (document.activeElement as HTMLElement)?.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useGlobalKeyboard() {
	useEffect(() => {
		function handler(e: KeyboardEvent) {
			if (isInputFocused()) {
				// Only allow Escape and Ctrl+K in inputs
				if (e.key !== "Escape" && !(e.ctrlKey && e.key === "k")) return;
			}

			const key = buildKeyString(e);
			const fn = shortcuts.get(key);
			if (fn) {
				e.preventDefault();
				fn(e);
			}
		}

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);
}

export function useKeyboardShortcut(key: string, handler: KeyHandler, deps: unknown[] = []) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: caller controls deps
	const stableHandler = useCallback(handler, deps);

	useEffect(() => {
		shortcuts.set(key, stableHandler);
		return () => {
			shortcuts.delete(key);
		};
	}, [key, stableHandler]);
}
