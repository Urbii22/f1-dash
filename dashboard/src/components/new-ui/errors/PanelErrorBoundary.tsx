"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { failed: boolean; key: number };

export default class PanelErrorBoundary extends Component<Props, State> {
	state: State = { failed: false, key: 0 };

	static getDerivedStateFromError(): Partial<State> {
		return { failed: true };
	}

	retry = () => {
		this.setState((s) => ({ failed: false, key: s.key + 1 }));
	};

	render() {
		if (this.state.failed) {
			return (
				<div
					role="status"
					aria-label={`${this.props.label ?? "Panel"} unavailable`}
					style={{ padding: "1rem", color: "var(--ui-muted)", border: "1px solid var(--ui-border)", borderRadius: 6 }}
				>
					<p>Panel unavailable</p>
					<button onClick={this.retry} style={{ marginTop: "0.5rem", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
						Retry
					</button>
				</div>
			);
		}
		return <div key={this.state.key}>{this.props.children}</div>;
	}
}
