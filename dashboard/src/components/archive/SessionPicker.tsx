import SessionCard from "@/components/archive/SessionCard";
import type { ArchiveSession } from "@/types/archive.type";

export default function SessionPicker({ sessions }: { sessions: ArchiveSession[] }) {
	const years = Map.groupBy(sessions, (session) => session.year);
	return <div className="flex flex-col gap-8">{Array.from(years.entries()).sort(([a],[b])=>b-a).map(([year,items])=><section key={year}><h2 className="mb-3 font-mono text-sm font-bold tracking-widest text-cyan-300">{year}</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(session=><SessionCard key={session.id} session={session}/>)}</div></section>)}</div>;
}
