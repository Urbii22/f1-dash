// Generates a synthetic Qualifying (Q1) replay so the /dashboard/qualifying view
// can be exercised end to end. Mirrors the SignalR line format of the live feed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const rs = String.fromCharCode(0x1e);
const out = resolve("sample-replay", "synthetic-quali.data.txt");

const drivers = [
	["1", "NOR", "Lando", "Norris", "McLaren", "F47600", "GBR"],
	["81", "PIA", "Oscar", "Piastri", "McLaren", "F47600", "AUS"],
	["63", "RUS", "George", "Russell", "Mercedes", "00D7B6", "GBR"],
	["12", "ANT", "Andrea Kimi", "Antonelli", "Mercedes", "00D7B6", "ITA"],
	["3", "VER", "Max", "Verstappen", "Red Bull Racing", "4781D7", "NED"],
	["6", "HAD", "Isack", "Hadjar", "Red Bull Racing", "4781D7", "FRA"],
	["16", "LEC", "Charles", "Leclerc", "Ferrari", "ED1131", "MON"],
	["44", "HAM", "Lewis", "Hamilton", "Ferrari", "ED1131", "GBR"],
	["23", "ALB", "Alexander", "Albon", "Williams", "64C4FF", "THA"],
	["55", "SAI", "Carlos", "Sainz", "Williams", "64C4FF", "ESP"],
	["30", "LAW", "Liam", "Lawson", "Racing Bulls", "6692FF", "NZL"],
	["41", "LIN", "Arvid", "Lindblad", "Racing Bulls", "6692FF", "GBR"],
	["14", "ALO", "Fernando", "Alonso", "Aston Martin", "229971", "ESP"],
	["18", "STR", "Lance", "Stroll", "Aston Martin", "229971", "CAN"],
	["31", "OCO", "Esteban", "Ocon", "Haas F1 Team", "B6BABD", "FRA"],
	["87", "BEA", "Oliver", "Bearman", "Haas F1 Team", "B6BABD", "GBR"],
	["27", "HUL", "Nico", "Hulkenberg", "Audi", "F50537", "GER"],
	["5", "BOR", "Gabriel", "Bortoleto", "Audi", "F50537", "BRA"],
	["10", "GAS", "Pierre", "Gasly", "Alpine", "0093CC", "FRA"],
	["43", "COL", "Franco", "Colapinto", "Alpine", "0093CC", "ARG"],
	["77", "BOT", "Valtteri", "Bottas", "Cadillac", "C6A35A", "FIN"],
	["11", "PER", "Sergio", "Perez", "Cadillac", "C6A35A", "MEX"],
];

const startTime = Date.parse("2026-06-07T14:00:00.000Z");
const time = (seconds) => new Date(startTime + seconds * 1000).toISOString();
const value = (v, overrides = {}) => ({ Value: v, Status: 0, OverallFastest: false, PersonalFastest: false, ...overrides });
const best = (v, p) => ({ Value: v, Position: p });
const segment = (status) => ({ Status: status });

// realistic Catalunya quali pace: pole ~1:11.0, spread to ~1:13.0 over 22 cars
const baseLap = 71.0;
const lapSeconds = (index) => baseLap + index * 0.092;
const lapTime = (seconds) => {
	const minutes = Math.floor(seconds / 60);
	const rest = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
	return `${minutes}:${rest}`;
};
const sectorParts = (seconds) => {
	const s1 = seconds * 0.32;
	const s2 = seconds * 0.42;
	const s3 = seconds - s1 - s2;
	return [s1.toFixed(3), s2.toFixed(3), s3.toFixed(3)];
};

const MICRO = 8;
const flyingSegments = () => Array.from({ length: MICRO }, () => segment(2049));
const pitSegments = () => [segment(2064), ...Array.from({ length: MICRO - 1 }, () => segment(0))];

const driverList = Object.fromEntries(
	drivers.map(([nr, tla, first, last, team, colour, country], index) => [
		nr,
		{
			RacingNumber: nr,
			BroadcastName: `${first[0]} ${last.toUpperCase()}`,
			FullName: `${first} ${last.toUpperCase()}`,
			Tla: tla,
			Line: index + 1,
			TeamName: team,
			TeamColour: colour,
			FirstName: first,
			LastName: last,
			Reference: `${tla}${nr}`,
			CountryCode: country,
		},
	]),
);

// position = grid order; bottom 5 (18-22) are in the elimination zone, two of
// them already knocked out to exercise that state.
const timingLine = (nr, index) => {
	const position = index + 1;
	const seconds = lapSeconds(index);
	const [s1, s2, s3] = sectorParts(seconds);
	const knockedOut = position >= 21;
	const inPit = position === 19 || position === 20;
	const flying = !inPit && !knockedOut && position % 3 === 0;
	const leaderSeconds = lapSeconds(0);

	return [
		nr,
		{
			RacingNumber: nr,
			Line: index + 1,
			Position: String(position),
			ShowPosition: true,
			Retired: false,
			Stopped: false,
			InPit: inPit,
			PitOut: false,
			KnockedOut: knockedOut,
			NumberOfLaps: knockedOut ? 6 : 8,
			GapToLeader: position === 1 ? "" : `+${(seconds - leaderSeconds).toFixed(3)}`,
			IntervalToPositionAhead: {
				Value: position === 1 ? "" : `+${(lapSeconds(index) - lapSeconds(index - 1)).toFixed(3)}`,
				Catching: false,
			},
			BestLapTime: best(lapTime(seconds), position),
			LastLapTime: value(lapTime(seconds + (flying ? 0 : 0.18)), {
				PersonalFastest: flying,
				OverallFastest: position === 1,
			}),
			Sectors: [
				{ Value: s1, PreviousValue: s1, Status: 0, OverallFastest: position === 1, PersonalFastest: flying, Segments: flying ? flyingSegments() : inPit ? pitSegments() : flyingSegments() },
				{ Value: flying ? s2 : "", PreviousValue: s2, Status: 0, OverallFastest: false, PersonalFastest: flying, Segments: flying ? flyingSegments() : Array.from({ length: MICRO }, () => segment(0)) },
				{ Value: "", PreviousValue: s3, Status: 0, OverallFastest: false, PersonalFastest: false, Segments: Array.from({ length: MICRO }, () => segment(0)) },
			],
			Speeds: {
				I1: value(String(315 - index)),
				I2: value(String(288 - index)),
				Fl: value(String(301 - index)),
				St: value(String(330 - index)),
			},
		},
	];
};

const statsLine = (nr, index) => {
	const seconds = lapSeconds(index);
	const [s1, s2, s3] = sectorParts(seconds - 0.12); // ideal slightly better than real
	return [
		nr,
		{
			Line: index + 1,
			RacingNumber: nr,
			PersonalBestLapTime: best(lapTime(seconds), index + 1),
			BestSectors: [best(s1, index + 1), best(s2, index + 1), best(s3, index + 1)],
			BestSpeeds: {
				I1: best(String(315 - index), index + 1),
				I2: best(String(288 - index), index + 1),
				Fl: best(String(301 - index), index + 1),
				St: best(String(330 - index), index + 1),
			},
		},
	];
};

const appLine = (nr, index) => [
	nr,
	{
		RacingNumber: nr,
		Line: index + 1,
		GridPos: String(index + 1),
		Stints: [{ Compound: index % 3 === 0 ? "SOFT" : index % 3 === 1 ? "MEDIUM" : "SOFT", TotalLaps: 3, New: "true" }],
	},
];

const raceControl = {
	Messages: [
		{ Utc: time(640), Lap: 7, Category: "Other", Message: "CAR 77 (BOT) LAP DELETED - TRACK LIMITS AT TURN 4 LAP 6" },
		{ Utc: time(610), Lap: 6, Category: "Other", Message: "CAR 11 (PER) LAP DELETED - TRACK LIMITS AT TURN 9 LAP 5" },
		{ Utc: time(420), Lap: 4, Category: "Flag", Flag: "GREEN", Message: "GREEN LIGHT - PIT EXIT OPEN" },
	],
};

const initial = {
	Heartbeat: { Utc: time(660) },
	ExtrapolatedClock: { Utc: time(660), Remaining: "00:06:30", Extrapolating: true },
	SessionInfo: {
		Meeting: {
			Key: 9999,
			Name: "Synthetic 2026 Validation GP",
			OfficialName: "LOCAL SYNTHETIC 2026 VALIDATION QUALIFYING",
			Location: "Local Validation",
			Country: { Key: 1, Code: "ESP", Name: "Spain" },
			Circuit: { Key: 15, ShortName: "Catalunya" },
		},
		ArchiveStatus: { Status: "Generating" },
		Key: 9998,
		Type: "Qualifying",
		Name: "Qualifying",
		StartDate: "2026-06-07T16:00:00",
		EndDate: "2026-06-07T17:00:00",
		GmtOffset: "02:00:00",
		Path: "2026/2026-06-07_Synthetic_Validation_GP/2026-06-07_Qualifying/",
	},
	TrackStatus: { Status: "1", Message: "AllClear" },
	SessionStatus: { Status: "Started" },
	LapCount: { CurrentLap: 1, TotalLaps: 1 },
	DriverList: driverList,
	TimingData: {
		SessionPart: 1,
		Lines: Object.fromEntries(drivers.map(([nr], index) => timingLine(nr, index))),
		Withheld: false,
	},
	TimingStats: {
		Withheld: false,
		Lines: Object.fromEntries(drivers.map(([nr], index) => statsLine(nr, index))),
		SessionType: "Qualifying",
		_kf: true,
	},
	TimingAppData: {
		Lines: Object.fromEntries(drivers.map(([nr], index) => appLine(nr, index))),
	},
	RaceControlMessages: raceControl,
	WeatherData: { AirTemp: "26.0", Humidity: "41.0", Pressure: "1012.0", Rainfall: "0", TrackTemp: "44.0", WindDirection: "210", WindSpeed: "1.8" },
};

const feed = (topic, data, seconds) => ({ type: 1, target: "feed", arguments: [topic, data, time(seconds)] });

// a few updates so the board animates and the clock ticks down
const updates = [];
for (let t = 1; t <= 12; t++) {
	updates.push(
		feed(
			"ExtrapolatedClock",
			{ Utc: time(660 + t * 5), Remaining: `00:0${Math.max(0, 6 - Math.floor(t / 2))}:${String(30 - t * 4).padStart(2, "0")}`, Extrapolating: true },
			660 + t * 5,
		),
	);
	// improve P3's lap on lap t to show a personal best / overtake of position
	if (t === 6) {
		const improved = lapSeconds(2) - 0.4;
		updates.push(
			feed(
				"TimingData",
				{ Lines: { "63": { BestLapTime: best(lapTime(improved), 2), LastLapTime: value(lapTime(improved), { PersonalFastest: true }) } } },
				660 + t * 5,
			),
		);
	}
}

const lines = [{}, { type: 3, invocationId: "synthetic-subscribe", result: initial }, ...updates];

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.map((line) => JSON.stringify(line) + rs).join("\n"));
console.log(`Wrote ${lines.length} lines to ${out}`);
