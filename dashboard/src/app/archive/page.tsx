import { env } from "@/env";
import type { ArchiveSession } from "@/types/archive.type";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleArchiveListView, DetailedArchiveListView } from "@/components/new-ui/archive/ArchiveViews";
import LegacyArchivePage from "@/components/archive/LegacyArchivePage";

export default async function ArchivePage() {
	let sessions: ArchiveSession[] = [];
	try {
		const response = await fetch(`${env.API_URL}/api/archive/sessions`, { cache: "no-store" });
		if (response.ok) sessions = await response.json();
	} catch {}

	return (
		<UiModeBoundary
			legacy={<LegacyArchivePage sessions={sessions} />}
			simple={<SimpleArchiveListView sessions={sessions} />}
			detailed={<DetailedArchiveListView sessions={sessions} />}
		/>
	);
}
