import Link from "next/link";
import type { ReactNode } from "react";
export default function ArchiveLayout({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen bg-black p-3 text-white">
			<div className="mx-auto max-w-7xl">
				<header className="telemetry-panel mb-3 flex items-center justify-between rounded-lg p-4">
					<Link href="/archive">
						<p className="panel-title">F1 Command</p>
						<span className="text-lg font-black">Session Archive</span>
					</Link>
					<div className="flex gap-4 font-mono text-sm">
						<Link href="/dashboard" className="text-cyan-300">
							Live
						</Link>
						<Link href="/archive" className="text-cyan-300">
							Archive
						</Link>
					</div>
				</header>
				{children}
			</div>
		</main>
	);
}
