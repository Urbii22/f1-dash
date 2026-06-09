import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";

const rs = String.fromCharCode(0x1e);
const out = resolve("sample-replay", "synthetic-f1-full-grid.data.txt");
const circuitKey = 15;
const season = 2026;

const drivers = [
	["1", "NOR", "Lando", "Norris", "McLaren", "F47600", "GBR", "MEDIUM"],
	["3", "VER", "Max", "Verstappen", "Red Bull Racing", "4781D7", "NED", "MEDIUM"],
	["16", "LEC", "Charles", "Leclerc", "Ferrari", "ED1131", "MON", "HARD"],
	["81", "PIA", "Oscar", "Piastri", "McLaren", "F47600", "AUS", "MEDIUM"],
	["63", "RUS", "George", "Russell", "Mercedes", "00D7B6", "GBR", "HARD"],
	["44", "HAM", "Lewis", "Hamilton", "Ferrari", "ED1131", "GBR", "MEDIUM"],
	["12", "ANT", "Andrea Kimi", "Antonelli", "Mercedes", "00D7B6", "ITA", "SOFT"],
	["14", "ALO", "Fernando", "Alonso", "Aston Martin", "229971", "ESP", "HARD"],
	["18", "STR", "Lance", "Stroll", "Aston Martin", "229971", "CAN", "MEDIUM"],
	["23", "ALB", "Alexander", "Albon", "Williams", "64C4FF", "THA", "HARD"],
	["55", "SAI", "Carlos", "Sainz", "Williams", "64C4FF", "ESP", "MEDIUM"],
	["31", "OCO", "Esteban", "Ocon", "Haas F1 Team", "B6BABD", "FRA", "HARD"],
	["87", "BEA", "Oliver", "Bearman", "Haas F1 Team", "B6BABD", "GBR", "MEDIUM"],
	["27", "HUL", "Nico", "Hulkenberg", "Kick Sauber", "52E252", "GER", "HARD"],
	["5", "BOR", "Gabriel", "Bortoleto", "Kick Sauber", "52E252", "BRA", "MEDIUM"],
	["22", "TSU", "Yuki", "Tsunoda", "Red Bull Racing", "4781D7", "JPN", "SOFT"],
	["30", "LAW", "Liam", "Lawson", "Racing Bulls", "6692FF", "NZL", "MEDIUM"],
	["6", "HAD", "Isack", "Hadjar", "Racing Bulls", "6692FF", "FRA", "HARD"],
	["10", "GAS", "Pierre", "Gasly", "Alpine", "0093CC", "FRA", "MEDIUM"],
	["43", "COL", "Franco", "Colapinto", "Alpine", "0093CC", "ARG", "HARD"],
];

const time = (seconds) => `2026-06-07T16:10:${String(seconds).padStart(2, "0")}.000Z`;
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
		InPit: index === 15,
		PitOut: index === 16,
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
		Messages: [
			{ Utc: time(11), Lap: 13, Category: "Flag", Flag: "GREEN", Scope: "Track", Message: "GREEN FLAG" },
			{ Utc: time(12), Lap: 13, Category: "Other", Scope: "Track", Message: "DRS ENABLED" },
		],
	},
	SessionInfo: {
		Meeting: {
			Key: 9999,
			Name: "Synthetic Full Grid GP",
			OfficialName: "SYNTHETIC FULL GRID GRAND PRIX 2026",
			Location: "Localhost",
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
		Path: "2026/Synthetic_Full_Grid_GP/Race",
		Number: 1,
	},
	SessionData: { Series: [{ Utc: time(10), Lap: 13 }], StatusSeries: [] },
	LapCount: { CurrentLap: 13, TotalLaps: 66 },
	TeamRadio: {
		Captures: [
			{ Utc: time(17), RacingNumber: "1", Path: "/teamradio/nor_001.mp3" },
			{ Utc: time(22), RacingNumber: "3", Path: "/teamradio/ver_001.mp3" },
			{ Utc: time(29), RacingNumber: "16", Path: "/teamradio/lec_001.mp3" },
			{ Utc: time(37), RacingNumber: "81", Path: "/teamradio/pia_001.mp3" },
			{ Utc: time(49), RacingNumber: "44", Path: "/teamradio/ham_001.mp3" },
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

const feed = (topic, data, timestamp) => ({
	type: 1,
	target: "feed",
	arguments: [topic, data, timestamp],
});

const lines = [{}, { type: 3, invocationId: "synthetic-subscribe", result: initial }];

for (let tick = 0; tick < 18; tick += 1) {
	const second = 13 + tick * 3;
	const lap = 13 + Math.floor(tick / 4);
	const leaderDelta = tick * 0.117;

	const timingUpdates = Object.fromEntries(
		drivers.map((driver, index) => {
			const [, tla] = driver;
			const positionSwing = tick === 6 && index === 2 ? 2 : tick === 6 && index === 3 ? 3 : index + 1;
			const gap = index === 0 ? `LAP ${lap}` : `+${(1.1 + index * 1.65 + leaderDelta + (tick % 3) * 0.19).toFixed(3)}`;

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
					...(tick === 10 && tla === "TSU" ? { InPit: true } : {}),
					...(tick === 11 && tla === "TSU" ? { InPit: false, PitOut: true } : {}),
				},
			];
		}),
	);

	lines.push(feed("TimingData", { Lines: timingUpdates }, time(second)));
	lines.push(feed("PositionZ", compressed(positionFrame(time(second), tick + 1)), time(second)));
	lines.push(feed("LapCount", { CurrentLap: lap, TotalLaps: 66 }, time(second + 1)));

	if (tick === 2) {
		lines.push(feed("TrackStatus", { Status: "2", Message: "Yellow" }, time(second + 2)));
		lines.push(feed("RaceControlMessages", { Messages: { 2: { Utc: time(second + 2), Lap: lap, Category: "Flag", Flag: "YELLOW", Scope: "Sector", Sector: 7, Message: "YELLOW FLAG IN SECTOR 7" } } }, time(second + 2)));
	}

	if (tick === 4) {
		lines.push(feed("RaceControlMessages", { Messages: { 3: { Utc: time(second + 2), Lap: lap, Category: "Other", Scope: "Driver", Message: "INCIDENT INVOLVING CARS 3 (VER) AND 16 (LEC) NOTED - TURN 1" } } }, time(second + 2)));
	}

	if (tick === 5) {
		lines.push(feed("TrackStatus", { Status: "1", Message: "AllClear" }, time(second + 2)));
		lines.push(feed("RaceControlMessages", { Messages: { 4: { Utc: time(second + 2), Lap: lap, Category: "Flag", Flag: "GREEN", Scope: "Track", Message: "GREEN FLAG" } } }, time(second + 2)));
	}

	if (tick === 8) {
		lines.push(feed("RaceControlMessages", { Messages: { 5: { Utc: time(second + 2), Lap: lap, Category: "Other", Scope: "Driver", Message: "CAR 22 TRACK LIMITS AT TURN 10" } } }, time(second + 2)));
	}

	if (tick === 12) {
		lines.push(feed("TeamRadio", { Captures: { 5: { Utc: time(second + 2), RacingNumber: "63", Path: "/teamradio/rus_002.mp3" } } }, time(second + 2)));
	}
}

lines.push(feed("SessionStatus", { Status: "Finished" }, time(68)));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.map((line) => JSON.stringify(line) + rs).join("\n"));
console.log(out);
