import Link from "next/link";
import type { ReactNode } from "react";

export default function H2HLayout({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen p-3">
			<div className="mx-auto max-w-6xl">
				<header className="telemetry-panel mb-3 flex items-center justify-between rounded-lg p-4">
					<Link href="/">
						<p className="panel-title">F1 Command</p>
						<span className="text-lg font-black">Season H2H</span>
					</Link>
					<nav className="flex gap-4 font-mono text-sm">
						<Link href="/results" className="text-cyan-300">
							Results
						</Link>
						<Link href="/dashboard/standings" className="text-cyan-300">
							Standings
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
