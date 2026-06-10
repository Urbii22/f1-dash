import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";

const rs = String.fromCharCode(0x1e);
const out = resolve("sample-replay", "synthetic-f1-full-grid.data.txt");
const circuitKey = 15;
const season = 2026;

const drivers = [
	["1", "NOR", "Lando", "Norris", "McLaren", "F47600", "GBR", "MEDIUM"],
	["81", "PIA", "Oscar", "Piastri", "McLaren", "F47600", "AUS", "MEDIUM"],
	["63", "RUS", "George", "Russell", "Mercedes", "00D7B6", "GBR", "HARD"],
	["12", "ANT", "Andrea Kimi", "Antonelli", "Mercedes", "00D7B6", "ITA", "SOFT"],
	["3", "VER", "Max", "Verstappen", "Red Bull Racing", "4781D7", "NED", "MEDIUM"],
	["6", "HAD", "Isack", "Hadjar", "Red Bull Racing", "4781D7", "FRA", "HARD"],
	["16", "LEC", "Charles", "Leclerc", "Ferrari", "ED1131", "MON", "HARD"],
	["44", "HAM", "Lewis", "Hamilton", "Ferrari", "ED1131", "GBR", "MEDIUM"],
	["23", "ALB", "Alexander", "Albon", "Williams", "64C4FF", "THA", "HARD"],
	["55", "SAI", "Carlos", "Sainz", "Williams", "64C4FF", "ESP", "MEDIUM"],
	["30", "LAW", "Liam", "Lawson", "Racing Bulls", "6692FF", "NZL", "MEDIUM"],
	["41", "LIN", "Arvid", "Lindblad", "Racing Bulls", "6692FF", "GBR", "SOFT"],
	["14", "ALO", "Fernando", "Alonso", "Aston Martin", "229971", "ESP", "HARD"],
	["18", "STR", "Lance", "Stroll", "Aston Martin", "229971", "CAN", "MEDIUM"],
	["31", "OCO", "Esteban", "Ocon", "Haas F1 Team", "B6BABD", "FRA", "HARD"],
	["87", "BEA", "Oliver", "Bearman", "Haas F1 Team", "B6BABD", "GBR", "MEDIUM"],
	["27", "HUL", "Nico", "Hulkenberg", "Audi", "F50537", "GER", "HARD"],
	["5", "BOR", "Gabriel", "Bortoleto", "Audi", "F50537", "BRA", "MEDIUM"],
	["10", "GAS", "Pierre", "Gasly", "Alpine", "0093CC", "FRA", "MEDIUM"],
	["43", "COL", "Franco", "Colapinto", "Alpine", "0093CC", "ARG", "HARD"],
	["77", "BOT", "Valtteri", "Bottas", "Cadillac", "C6A35A", "FIN", "HARD"],
	["11", "PER", "Sergio", "Perez", "Cadillac", "C6A35A", "MEX", "MEDIUM"],
];

const startTime = Date.parse("2026-06-07T16:10:00.000Z");
const time = (seconds) => new Date(startTime + seconds * 1000).toISOString();
const value = (v, overrides = {}) => ({ Value: v, Status: 0, OverallFastest: false, PersonalFastest: false, ...overrides });
const best = (v, p) => ({ Value: v, Position: p });
const segment = (status) => ({ Status: status });
const lapTime = (seconds) => {
	const minutes = Math.floor(seconds / 60);
	const rest = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
	return `${minutes}:${rest}`;
};
const sectorTime = (base, position, sector) => (base + position * 0.071 + sector * 0.127).toFixed(3);
const speedValue = (base, position) => String(Math.max(base - Math.floor(position / 2), base - 14));
const compressed = (payload) => deflateRawSync(Buffer.from(JSON.stringify(payload))).toString("base64");

const loadTrackPoints = async () => {
	try {
		const response = await fetch(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${season}`);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const map = await response.json();
		return map.x.map((x, index) => ({ x, y: map.y[index] }));
	} catch (error) {
		console.warn(`Could not fetch circuit map, using fallback loop: ${error.message}`);
		return Array.from({ length: 900 }, (_, index) => {
			const angle = (index / 900) * Math.PI * 2;
			return {
				x: Math.cos(angle) * 5200 + Math.sin(angle * 3) * 620,
				y: Math.sin(angle) * 3600 + Math.cos(angle * 2) * 420,
			};
		});
	}
};

const trackPoints = await loadTrackPoints();

const positionFrame = (timestamp, tick = 0) => ({
	Position: [
		{
			Timestamp: timestamp,
			Entries: Object.fromEntries(
				drivers.map((driver, index) => {
					const [nr] = driver;
					const pace = 0.031 + (drivers.length - index) * 0.00042;
					const progress = (index / drivers.length + tick * pace) % 1;
					const pointIndex = Math.floor(progress * (trackPoints.length - 1));
					const point = trackPoints[pointIndex];

					return [
						nr,
						{
							Status: "OnTrack",
							X: Math.round(point.x * 100) / 100,
							Y: Math.round(point.y * 100) / 100,
							Z: 0,
						},
					];
				}),
			),
		},
	],
});

const carFrame = (timestamp, tick = 0) => ({
	Entries: [
		{
			Utc: timestamp,
			Cars: Object.fromEntries(
				drivers.map((driver, index) => {
					const speed = 245 + ((tick * 13 + index * 7) % 85);
					return [
						driver[0],
						{
							Channels: {
								"0": 9000 + ((tick * 173 + index * 91) % 2800),
								"2": speed,
								"3": 2 + ((tick + index) % 6),
								"4": 25 + ((tick + index) % 75),
								"5": tick % 5 === 0 ? 80 : 0,
							},
						},
					];
				}),
			),
		},
	],
});

const buildSectors = (position, completeThird = position < 12) =>
	[0, 1, 2].map((sectorIndex) => {
		const overall = position === 1 && sectorIndex !== 1;
		const personal = position <= 8 || sectorIndex === position % 3;
		const incomplete = sectorIndex === 2 && !completeThird;

		return {
			Stopped: false,
			Value: incomplete ? "" : sectorTime([25.22, 29.54, 23.85][sectorIndex], position, sectorIndex),
			PreviousValue: "",
			Status: 0,
			OverallFastest: overall,
			PersonalFastest: personal && !incomplete,
			Segments: (incomplete ? [2049, 2049, 0, 0, 0] : [2049, 2049, 2049, 2049, 2049]).map(segment),
		};
	});

const driverListEntry = ([nr, tla, first, last, team, colour, country], index) => ({
	RacingNumber: nr,
	BroadcastName: `${first[0]} ${last.toUpperCase()}`,
	FullName: `${first} ${last.toUpperCase()}`,
	Tla: tla,
	Line: index + 1,
	TeamName: team,
	TeamColour: colour,
	FirstName: first,
	LastName: last,
	Reference: `${first.slice(0, 3).toUpperCase()}${last.slice(0, 3).toUpperCase()}01`,
	HeadshotUrl: "",
	CountryCode: country,
});

const timingDriver = (driver, index) => {
	const [nr] = driver;
	const position = index + 1;
	const gapSeconds = index === 0 ? 0 : 1.2 + index * 1.74 + (index % 4) * 0.31;
	const intervalSeconds = index === 0 ? 0 : 0.7 + (index % 6) * 0.38;
	const baseLap = 78.74 + index * 0.24 + (index % 3) * 0.08;

	return {
		GapToLeader: index === 0 ? "LAP 13" : `+${gapSeconds.toFixed(3)}`,
		IntervalToPositionAhead: { Value: index === 0 ? "" : `+${intervalSeconds.toFixed(3)}`, Catching: index % 5 === 0 },
		Line: position,
		Position: String(position),
		ShowPosition: true,
		RacingNumber: nr,
		Retired: false,
		InPit: false,
		PitOut: false,
		Stopped: false,
		Status: 0,
		Sectors: buildSectors(position),
		Speeds: {
			I1: value(speedValue(287, index)),
			I2: value(speedValue(303, index)),
			Fl: value(speedValue(276, index)),
			St: value(speedValue(320, index)),
		},
		BestLapTime: best(lapTime(baseLap), position),
		LastLapTime: value(lapTime(baseLap + 0.34 + (index % 4) * 0.11)),
		NumberOfLaps: index < 18 ? 13 : 12,
	};
};

const initial = {
	Heartbeat: { Utc: time(10) },
	ExtrapolatedClock: { Utc: time(10), Remaining: "00:42:15", Extrapolating: false },
	WeatherData: {
		AirTemp: "24.1",
		Humidity: "48.0",
		Pressure: "1009.3",
		Rainfall: "0",
		TrackTemp: "36.7",
		WindDirection: "226",
		WindSpeed: "1.8",
	},
	TrackStatus: { Status: "1", Message: "AllClear" },
	SessionStatus: { Status: "Started" },
	DriverList: Object.fromEntries(drivers.map((driver, index) => [driver[0], driverListEntry(driver, index)])),
	RaceControlMessages: {
		Messages: [{ Utc: time(0), Lap: 13, Category: "Flag", Flag: "GREEN", Scope: "Track", Message: "GREEN FLAG" }],
	},
	SessionInfo: {
		Meeting: {
			Key: 9999,
			Name: "Synthetic 2026 Validation GP",
			OfficialName: "LOCAL SYNTHETIC 2026 VALIDATION REPLAY",
			Location: "Local Validation",
			Country: { Key: 1, Code: "ESP", Name: "Spain" },
			Circuit: { Key: 15, ShortName: "Catalunya" },
		},
		ArchiveStatus: { Status: "Generating" },
		Key: 999901,
		Type: "Race",
		Name: "Race",
		StartDate: "2026-06-07T16:10:00Z",
		EndDate: "2026-06-07T18:10:00Z",
		GmtOffset: "02:00:00",
		Path: "2026/Local_Synthetic_Validation/Race",
		Number: 1,
	},
	SessionData: { Series: [{ Utc: time(10), Lap: 13 }], StatusSeries: [] },
	LapCount: { CurrentLap: 13, TotalLaps: 66 },
	TeamRadio: {
		Captures: [
			{ Utc: time(45), RacingNumber: "1", Path: "/teamradio/nor_001.mp3" },
			{ Utc: time(145), RacingNumber: "3", Path: "/teamradio/ver_001.mp3" },
			{ Utc: time(285), RacingNumber: "16", Path: "/teamradio/lec_001.mp3" },
			{ Utc: time(405), RacingNumber: "77", Path: "/teamradio/bot_001.mp3" },
		],
	},
	TimingAppData: {
		Lines: Object.fromEntries(
			drivers.map((driver, index) => [
				driver[0],
				{
					RacingNumber: driver[0],
					Line: index + 1,
					GridPos: String(index < 6 ? index + 2 : index),
					Stints: [{ Compound: driver[7], New: index < 12 ? "true" : "false", TotalLaps: 13 - (index % 3) }],
				},
			]),
		),
	},
	TimingStats: {
		Withheld: false,
		SessionType: "Race",
		Lines: Object.fromEntries(
			drivers.map((driver, index) => [
				driver[0],
				{
					Line: index + 1,
					RacingNumber: driver[0],
					PersonalBestLapTime: best(lapTime(78.74 + index * 0.24 + (index % 3) * 0.08), index + 1),
					BestSectors: [best(sectorTime(25.22, index + 1, 0), index + 1), best(sectorTime(29.54, index + 1, 1), index + 1), best(sectorTime(23.85, index + 1, 2), index + 1)],
					BestSpeeds: {},
				},
			]),
		),
	},
	TimingData: {
		Withheld: false,
		SessionPart: 0,
		Lines: Object.fromEntries(drivers.map((driver, index) => [driver[0], timingDriver(driver, index)])),
	},
};

initial.PositionZ = compressed(positionFrame(time(10)));
initial.CarDataZ = compressed(carFrame(time(10)));

const feed = (topic, data, timestamp) => ({
	type: 1,
	target: "feed",
	arguments: [topic, data, timestamp],
});

const lines = [{}, { type: 3, invocationId: "synthetic-subscribe", result: initial }];

const eventAt = (second, topic, data) => lines.push(feed(topic, data, time(second)));

for (let second = 10, tick = 0; second <= 480; second += 10, tick += 1) {
	const lap = 13 + Math.floor(second / 40);
	const leaderDelta = tick * 0.041;

	const timingUpdates = Object.fromEntries(
		drivers.map((driver, index) => {
			const [, tla] = driver;
			const positionSwing = second >= 130 && second < 260 && index === 4 ? 6 : second >= 130 && second < 260 && index === 5 ? 5 : index + 1;
			const gap = index === 0 ? `LAP ${lap}` : `+${(1.1 + index * 1.65 + leaderDelta + (tick % 3) * 0.19).toFixed(3)}`;
			const lawsonPit = tla === "LAW" && second >= 180 && second < 210;
			const lawsonPitOut = tla === "LAW" && second >= 210 && second < 230;
			const bottasPit = tla === "BOT" && second >= 330 && second < 360;
			const bottasPitOut = tla === "BOT" && second >= 360 && second < 380;
			const hasPitSequence = tla === "LAW" || tla === "BOT";
			const retired = tla === "SAI" && second >= 430;

			return [
				driver[0],
				{
					Position: String(positionSwing),
					Line: positionSwing,
					GapToLeader: gap,
					IntervalToPositionAhead: {
						Value: index === 0 ? "" : `+${(0.62 + (index % 5) * 0.35 + (tick % 2) * 0.04).toFixed(3)}`,
						Catching: (index + tick) % 6 === 0,
					},
					LastLapTime: value(lapTime(78.88 + index * 0.22 + tick * 0.015), {
						PersonalFastest: tick % 5 === index % 5,
						OverallFastest: index === 0 && tick % 6 === 0,
					}),
					NumberOfLaps: lap,
					Retired: retired,
					Stopped: retired,
					Sectors: {
						[tick % 3]: {
							Value: sectorTime([25.2, 29.5, 23.8][tick % 3], index + 1, tick % 3),
							PersonalFastest: (index + tick) % 7 === 0,
							OverallFastest: index === 0 && tick % 4 === 0,
							Segments: {
								0: { Status: 2049 },
								1: { Status: tick % 4 === 0 ? 2051 : 2049 },
								2: { Status: 2049 },
								3: { Status: 2049 },
								4: { Status: 2049 },
							},
						},
					},
					...(hasPitSequence
						? {
								InPit: lawsonPit || bottasPit,
								PitOut: lawsonPitOut || bottasPitOut,
							}
						: {}),
				},
			];
		}),
	);

	eventAt(second, "TimingData", { Lines: timingUpdates });
	eventAt(second, "PositionZ", compressed(positionFrame(time(second), tick + 1)));
	eventAt(second, "CarDataZ", compressed(carFrame(time(second), tick + 1)));
	eventAt(second, "LapCount", { CurrentLap: lap, TotalLaps: 66 });

	if (second === 70) {
		eventAt(second, "TrackStatus", { Status: "2", Message: "Yellow" });
		eventAt(second, "RaceControlMessages", { Messages: { 2: { Utc: time(second), Lap: lap, Category: "Flag", Flag: "YELLOW", Scope: "Sector", Sector: 7, Message: "YELLOW FLAG IN SECTOR 7" } } });
	}

	if (second === 110) {
		eventAt(second, "TrackStatus", { Status: "1", Message: "AllClear" });
		eventAt(second, "RaceControlMessages", { Messages: { 3: { Utc: time(second), Lap: lap, Category: "Flag", Flag: "GREEN", Scope: "Track", Message: "GREEN FLAG" } } });
	}

	if (second === 130) {
		eventAt(second, "RaceControlMessages", { Messages: { 4: { Utc: time(second), Lap: lap, Category: "Other", Scope: "Driver", Message: "CARS 3 AND 6 EXCHANGE POSITION" } } });
	}

	if (second === 180) {
		eventAt(second, "RaceControlMessages", { Messages: { 5: { Utc: time(second), Lap: lap, Category: "Other", Scope: "Driver", Message: "CAR 30 ENTERS PIT LANE" } } });
	}

	if (second === 270) {
		eventAt(second, "RaceControlMessages", { Messages: { 6: { Utc: time(second), Lap: lap, Category: "Other", Scope: "Driver", Message: "CAR 41 TRACK LIMITS AT TURN 10" } } });
	}

	if (second === 330) {
		eventAt(second, "RaceControlMessages", { Messages: { 7: { Utc: time(second), Lap: lap, Category: "Other", Scope: "Driver", Message: "CAR 77 ENTERS PIT LANE" } } });
	}

	if (second === 430) {
		eventAt(second, "RaceControlMessages", { Messages: { 8: { Utc: time(second), Lap: lap, Category: "Other", Scope: "Driver", Message: "CAR 55 STOPPED - RETIRED" } } });
	}
}

eventAt(480, "SessionStatus", { Status: "Finished" });

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.map((line) => JSON.stringify(line) + rs).join("\n"));
console.log(out);
