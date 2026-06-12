import type { Message } from "@/types/state.type";

export type RaceControlVisualKind =
	| "penalty"
	| "investigation"
	| "track-limits"
	| "flag-yellow"
	| "flag-red"
	| "flag-green"
	| "flag-blue"
	| "flag-chequered"
	| "flag"
	| "safety-car"
	| "drs"
	| "general";

type RaceControlVisual = {
	kind: RaceControlVisualKind;
	label: string;
};

type VisualMessage = Pick<Message, "Message" | "Category"> & Partial<Pick<Message, "Flag">>;

export function classifyRaceControlMessage(msg: VisualMessage): RaceControlVisual {
	const text = msg.Message.toUpperCase();
	const category = msg.Category.toUpperCase();

	if (/PENALTY|DISQUALIFIED|BLACK FLAG/.test(text)) return { kind: "penalty", label: "Penalty" };
	if (/INVESTIGAT|INCIDENT NOTED|REVIEWED/.test(text)) return { kind: "investigation", label: "Investigation" };
	if (/TRACK LIMIT|LAP TIME DELETED/.test(text)) return { kind: "track-limits", label: "Track limits" };
	if (category === "SAFETYCAR" || /SAFETY CAR|VIRTUAL SAFETY CAR|VSC /.test(text)) {
		return { kind: "safety-car", label: "Safety car" };
	}
	if (category === "DRS" || /DRS (ENABLED|DISABLED)/.test(text)) return { kind: "drs", label: "DRS" };

	if (msg.Flag) {
		switch (msg.Flag) {
			case "YELLOW":
			case "DOUBLE YELLOW":
				return { kind: "flag-yellow", label: msg.Flag === "DOUBLE YELLOW" ? "Double yellow" : "Yellow flag" };
			case "RED":
				return { kind: "flag-red", label: "Red flag" };
			case "GREEN":
				return { kind: "flag-green", label: "Green flag" };
			case "BLUE":
				return { kind: "flag-blue", label: "Blue flag" };
			case "CHEQUERED":
				return { kind: "flag-chequered", label: "Chequered flag" };
			default:
				return { kind: "flag", label: "Flag status" };
		}
	}

	if (category === "FLAG") return { kind: "flag", label: "Flag status" };
	return { kind: "general", label: "Race control" };
}
