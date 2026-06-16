import { notFound } from "next/navigation";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleArchiveSessionView, DetailedArchiveSessionView } from "@/components/new-ui/archive/ArchiveViews";
import ArchiveAnalysis from "@/components/archive/ArchiveAnalysis";
import { env } from "@/env";
import type { ArchiveEvent, ArchiveLaps, ArchiveSessionDetail, ArchiveStints } from "@/types/archive.type";

async function get<T>(path: string): Promise<T> {
	const response = await fetch(`${env.API_URL}${path}`);
	if (response.status === 404) notFound();
	if (!response.ok) throw new Error(`Archive API ${response.status}`);
	return response.json();
}

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
	const { sessionId } = await params;
	const id = Number(sessionId);
	const [session, laps, stints, events] = await Promise.all([
		get<ArchiveSessionDetail>(`/api/archive/sessions/${id}`),
		get<{ laps: ArchiveLaps }>(`/api/archive/sessions/${id}/laps`),
		get<{ stints: ArchiveStints }>(`/api/archive/sessions/${id}/stints`),
		get<ArchiveEvent[]>(`/api/archive/sessions/${id}/events`),
	]);

	return (
		<UiModeBoundary
			legacy={<ArchiveAnalysis session={session} laps={laps.laps} stints={stints.stints} events={events} />}
			simple={<SimpleArchiveSessionView session={session} laps={laps.laps} stints={stints.stints} events={events} />}
			detailed={<DetailedArchiveSessionView session={session} laps={laps.laps} stints={stints.stints} events={events} />}
		/>
	);
}
