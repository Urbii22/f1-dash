import { NextResponse } from "next/server";
import { env } from "@/env";
import type { Round } from "@/types/schedule.type";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const res = await fetch(`${env.API_URL}/api/schedule/next`, { cache: "no-store" });
		if (res.status === 204 || !res.ok) {
			return NextResponse.json({ round: null });
		}
		const round: Round = await res.json();
		return NextResponse.json({ round });
	} catch (e) {
		console.error("next-session proxy failed", e);
		return NextResponse.json({ round: null });
	}
}
