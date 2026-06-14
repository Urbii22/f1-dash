import type { Round } from "@/types/schedule.type";

export async function getSchedule(): Promise<Round[]> {
	try {
		const response = await fetch(`${process.env.API_URL ?? ""}/api/schedule`, { next: { revalidate: 300 } });
		if (!response.ok) return [];
		return (await response.json()) as Round[];
	} catch {
		return [];
	}
}
