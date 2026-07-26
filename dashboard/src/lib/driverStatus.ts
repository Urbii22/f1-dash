export type DriverStatus =
	| { kind: "none"; label: "" }
	| { kind: "pit"; label: "PIT" }
	| { kind: "pit-out"; label: "PIT OUT" }
	| { kind: "drs-off" | "drs-ready" | "drs-active"; label: "DRS" };

type SessionMetadata = {
	StartDate?: string;
	Path?: string;
};

type DriverStatusInput = {
	year: number | null;
	inPit?: boolean;
	pitOut?: boolean;
	legacyChannel?: number | null;
};

export function getSessionYear(session: SessionMetadata | undefined): number | null {
	const startDateYear = session?.StartDate?.match(/^(\d{4})-/)?.[1];
	if (startDateYear) return Number(startDateYear);

	const pathYear = session?.Path?.match(/^(\d{4})(?:\/|$)/)?.[1];
	return pathYear ? Number(pathYear) : null;
}

export function getDriverStatus({ year, inPit, pitOut, legacyChannel }: DriverStatusInput): DriverStatus {
	if (inPit) return { kind: "pit", label: "PIT" };
	if (pitOut) return { kind: "pit-out", label: "PIT OUT" };
	if (year === null || year >= 2026) return { kind: "none", label: "" };

	if (legacyChannel === 8) return { kind: "drs-ready", label: "DRS" };
	if (typeof legacyChannel === "number" && legacyChannel > 9) return { kind: "drs-active", label: "DRS" };
	return { kind: "drs-off", label: "DRS" };
}
