import Link from "next/link";
import type { ArchiveSession } from "@/types/archive.type";

export default function SessionCard({ session }: { session: ArchiveSession }) {
	const badge = session.kind.toLowerCase().includes("qual") ? "Q" : session.kind.toLowerCase().includes("race") ? "R" : "FP";
	return <Link href={`/archive/${session.id}`} className="data-chip block rounded-lg p-4 transition hover:border-cyan-300/50 hover:bg-cyan-300/5">
		<div className="flex items-start justify-between gap-3"><div><p className="panel-title">{session.year} · {session.country ?? "F1"}</p><h2 className="mt-1 text-lg font-black text-white">{session.meeting}</h2><p className="font-mono text-sm text-zinc-400">{session.name}</p></div><div className="flex gap-2"><span className="rounded bg-cyan-300 px-2 py-1 font-mono text-xs font-black text-black">{badge}</span>{!session.complete&&<span className="rounded border border-amber-400/40 px-2 py-1 font-mono text-xs text-amber-300">partial</span>}</div></div>
	</Link>;
}
