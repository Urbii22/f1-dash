import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
export async function GET(request: NextRequest) {
	const query = request.nextUrl.searchParams;
	const sessionId = query.get("sessionId");
	const driver = query.get("driver");
	const lap = query.get("lap");
	if (!sessionId || !driver || !lap) return NextResponse.json({ error: "missing parameters" }, { status: 400 });
	const response = await fetch(
		`${env.API_URL}/api/archive/sessions/${sessionId}/telemetry?driver=${encodeURIComponent(driver)}&lap=${lap}`,
		// Archived telemetry is effectively immutable; cache it so repeated lap
		// comparisons don't refetch. Revalidate hourly to cover still-ingesting sessions.
		{ next: { revalidate: 3600 } },
	);
	return new NextResponse(await response.text(), {
		status: response.status,
		headers: { "content-type": "application/json" },
	});
}
