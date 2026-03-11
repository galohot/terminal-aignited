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
				<div className="flex h-screen flex-col items-center justify-center gap-4 bg-t-bg p-8 text-center">
					<div className="font-mono text-lg font-semibold text-white">Something went wrong</div>
					<p className="max-w-md text-sm text-t-text-secondary">
						An unexpected error occurred. Try refreshing the page.
					</p>
					<button
						type="button"
						onClick={() => {
							this.setState({ hasError: false });
							window.location.href = "/";
						}}
						className="mt-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs uppercase tracking-wider text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
					>
						Reload
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
