import type { ArchiveSession } from "@/types/archive.type";

export async function getArchiveSessions(year?: number): Promise<ArchiveSession[]> {
	try {
		const query = year ? `?year=${year}` : "";
		const response = await fetch(`${process.env.API_URL ?? ""}/api/archive/sessions${query}`, {
			cache: "no-store",
		});
		if (!response.ok) return [];
		return (await response.json()) as ArchiveSession[];
	} catch {
		return [];
	}
}
