import React, { Component, ErrorInfo, ReactNode } from "react";
import App from "./App.tsx";
// Removed imports from _cofounder/dev
// import FirstLaunch from "@/_cofounder/dev/firstlaunch.tsx";
// import Cmdl from "@/_cofounder/dev/cmdl.tsx";

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
		};
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("Application Error:", error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
					<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
						<div className="mb-4">
							<svg
								className="mx-auto h-16 w-16 text-red-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Something went wrong
						</h1>
						<p className="text-gray-600 mb-4">
							We apologize for the inconvenience. An unexpected error occurred.
						</p>
						{this.state.error && (
							<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-left">
								<p className="text-xs text-red-800 font-mono">
									{this.state.error.message}
								</p>
							</div>
						)}
						<button
							onClick={() => window.location.reload()}
							className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
						>
							Reload Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

// ============================================================================
// APP WRAPPER
// ============================================================================

const AppWrapper: React.FC = () => {
	return (
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	);
};

export default AppWrapper;
