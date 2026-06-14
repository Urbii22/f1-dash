import Link from "next/link";
import type { ReactNode } from "react";

export default function DriverLayout({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen p-3">
			<div className="mx-auto max-w-6xl">
				<header className="telemetry-panel mb-3 flex items-center justify-between rounded-lg p-4">
					<Link href="/">
						<p className="panel-title">F1 Command</p>
						<span className="text-lg font-black">Driver profile</span>
					</Link>
					<nav className="flex gap-4 font-mono text-sm">
						<Link href="/h2h" className="text-cyan-300">
							H2H
						</Link>
						<Link href="/results" className="text-cyan-300">
							Results
						</Link>
						<Link href="/dashboard/standings" className="text-cyan-300">
							Standings
						</Link>
					</nav>
				</header>
				{children}
			</div>
		</main>
	);
}
