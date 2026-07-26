import Link from "next/link";
import type { ReactNode } from "react";

import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import NewUiPublicShell from "@/components/new-ui/shell/NewUiPublicShell";

export default function ResultsLayout({ children }: { children: ReactNode }) {
	return (
		<UiModeBoundary
			legacy={<LegacyResultsShell>{children}</LegacyResultsShell>}
			simple={<NewUiPublicShell>{children}</NewUiPublicShell>}
			detailed={<NewUiPublicShell>{children}</NewUiPublicShell>}
		/>
	);
}

function LegacyResultsShell({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen p-3 text-white">
			<div className="mx-auto max-w-7xl">
				<header className="telemetry-panel mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
					<Link href="/">
						<p className="panel-title">F1 Command</p>
						<span className="text-lg font-black">Season Centre</span>
					</Link>
					<nav className="flex gap-4 font-mono text-sm">
						<Link href="/results" className="text-cyan-300">
							Results
						</Link>
						<Link href="/dashboard/standings" className="text-cyan-300">
							Standings
						</Link>
						<Link href="/h2h" className="text-cyan-300">
							H2H
						</Link>
						<Link href="/dashboard" className="text-cyan-300">
							Live
						</Link>
					</nav>
				</header>
				{children}
			</div>
		</main>
	);
}
