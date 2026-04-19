import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary]", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-screen flex-col items-center justify-center gap-4 bg-paper p-8 text-center">
					<div
						className="text-[clamp(1.5rem,3vw,2rem)] leading-tight text-ink"
						style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
					>
						Something <em className="text-ember-600">went wrong</em>
					</div>
					<p className="max-w-md font-mono text-sm text-ink-3">
						An unexpected error occurred. Try refreshing the page.
					</p>
					<button
						type="button"
						onClick={() => {
							this.setState({ hasError: false });
							window.location.href = "/";
						}}
						className="mt-2 rounded-full border border-rule bg-card px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink-3 transition-colors hover:border-ember-400/40 hover:bg-ember-50 hover:text-ember-700"
					>
						Reload
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
