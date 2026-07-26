import type { State, CarsData, Positions } from "@/types/state.type";

export type UiFixtureScenario =
	| "simple-race"
	| "detailed-race"
	| "yellow-flag"
	| "no-session"
	| "disconnected-replay"
	| "qualifying"
	| "weather"
	| "archive";

export type UiFixture = {
	state: State | null;
	carsData: CarsData | null;
	positions: Positions | null;
	generation: "legacy" | "new";
	density: "simple" | "detailed";
	connected: boolean;
};

const BASE_UTC = "2026-07-05T14:00:00Z";

const DRIVERS = [
	{ num: "1", tla: "VER", first: "Max", last: "Verstappen", team: "Red Bull Racing", colour: "3671C6" },
	{ num: "4", tla: "NOR", first: "Lando", last: "Norris", team: "McLaren", colour: "FF8000" },
	{ num: "16", tla: "LEC", first: "Charles", last: "Leclerc", team: "Ferrari", colour: "E8002D" },
	{ num: "63", tla: "RUS", first: "George", last: "Russell", team: "Mercedes", colour: "27F4D2" },
	{ num: "44", tla: "HAM", first: "Lewis", last: "Hamilton", team: "Ferrari", colour: "E8002D" },
	{ num: "55", tla: "SAI", first: "Carlos", last: "Sainz", team: "Williams", colour: "64C4FF" },
	{ num: "81", tla: "PIA", first: "Oscar", last: "Piastri", team: "McLaren", colour: "FF8000" },
	{ num: "14", tla: "ALO", first: "Fernando", last: "Alonso", team: "Aston Martin", colour: "229971" },
	{ num: "18", tla: "STR", first: "Lance", last: "Stroll", team: "Aston Martin", colour: "229971" },
	{ num: "10", tla: "GAS", first: "Pierre", last: "Gasly", team: "Alpine", colour: "0093CC" },
	{ num: "31", tla: "OCO", first: "Esteban", last: "Ocon", team: "Haas", colour: "B6BABD" },
	{ num: "77", tla: "BOT", first: "Valtteri", last: "Bottas", team: "Kick Sauber", colour: "52E252" },
	{ num: "24", tla: "ZHO", first: "Guanyu", last: "Zhou", team: "Kick Sauber", colour: "52E252" },
	{ num: "27", tla: "HUL", first: "Nico", last: "Hulkenberg", team: "Haas", colour: "B6BABD" },
	{ num: "22", tla: "TSU", first: "Yuki", last: "Tsunoda", team: "Racing Bulls", colour: "6692FF" },
	{ num: "3", tla: "RIC", first: "Daniel", last: "Ricciardo", team: "Racing Bulls", colour: "6692FF" },
	{ num: "20", tla: "MAG", first: "Kevin", last: "Magnussen", team: "Haas", colour: "B6BABD" },
	{ num: "23", tla: "ALB", first: "Alexander", last: "Albon", team: "Williams", colour: "64C4FF" },
	{ num: "2", tla: "SAR", first: "Logan", last: "Sargeant", team: "Williams", colour: "64C4FF" },
	{ num: "43", tla: "COL", first: "Franco", last: "Colapinto", team: "Williams", colour: "64C4FF" },
];

function buildDriverList(): State["DriverList"] {
	const list: State["DriverList"] = {};
	for (const d of DRIVERS) {
		list[d.num] = {
			RacingNumber: d.num,
			BroadcastName: `${d.last.toUpperCase()} ${d.first[0]}`,
			FullName: `${d.first} ${d.last}`,
			Tla: d.tla,
			Line: DRIVERS.indexOf(d) + 1,
			TeamName: d.team,
			TeamColour: d.colour,
			FirstName: d.first,
			LastName: d.last,
			Reference: d.tla,
			HeadshotUrl: "",
			CountryCode: "GB",
		};
	}
	return list;
}

function buildTimingData(): State["TimingData"] {
	const lines: NonNullable<State["TimingData"]>["Lines"] = {};
	for (let i = 0; i < DRIVERS.length; i++) {
		const d = DRIVERS[i];
		const pos = i + 1;
		lines[d.num] = {
			GapToLeader: i === 0 ? "" : `+${(i * 2.3).toFixed(3)}s`,
			IntervalToPositionAhead: i === 0 ? undefined : { Value: `+${(2.3).toFixed(3)}s`, Catching: false },
			Line: pos,
			Position: String(pos),
			ShowPosition: true,
			RacingNumber: d.num,
			Retired: false,
			InPit: false,
			PitOut: false,
			Stopped: false,
			Status: 0,
			Sectors: [],
			Speeds: {
				I1: { Value: i > 17 ? "" : "285", Status: 0, OverallFastest: false, PersonalFastest: false },
				I2: { Value: "310", Status: 0, OverallFastest: false, PersonalFastest: false },
				FL: { Value: "295", Status: 0, OverallFastest: false, PersonalFastest: false },
				ST: { Value: "320", Status: 0, OverallFastest: false, PersonalFastest: false },
			},
			BestLapTime: { Value: `1:2${(7 + i * 0.1).toFixed(3)}`, Position: pos },
			LastLapTime: {
				Value: `1:2${(8 + i * 0.1).toFixed(3)}`,
				Status: 2048,
				OverallFastest: i === 0,
				PersonalFastest: true,
			},
			NumberOfLaps: 35,
		};
	}
	return {
		Lines: lines,
		Withheld: false,
	};
}

function buildTimingAppData(): State["TimingAppData"] {
	const lines: NonNullable<State["TimingAppData"]>["Lines"] = {};
	const compounds = ["SOFT", "MEDIUM", "HARD"] as const;
	for (let i = 0; i < DRIVERS.length; i++) {
		const d = DRIVERS[i];
		lines[d.num] = {
			RacingNumber: d.num,
			Stints: [{ TotalLaps: 15, Compound: compounds[i % 3], New: "TRUE" }],
			Line: i + 1,
			GridPos: String(i + 1),
		};
	}
	return { Lines: lines };
}

function buildSessionInfo(type: "Race" | "Qualifying" = "Race"): State["SessionInfo"] {
	return {
		Meeting: {
			Key: 1201,
			Name: "British Grand Prix",
			OfficialName: "Formula 1 Qatar Airways British Grand Prix 2026",
			Location: "Silverstone",
			Country: { Key: 72, Code: "GBR", Name: "Great Britain" },
			Circuit: { Key: 1, ShortName: "Silverstone" },
		},
		ArchiveStatus: { Status: "Complete" },
		Key: 9472,
		Type: type,
		Name: type === "Race" ? "Race" : "Qualifying",
		StartDate: BASE_UTC,
		EndDate: "2026-07-05T16:30:00Z",
		GmtOffset: "01:00:00",
		Path: "2026/2026-07-05_British_Grand_Prix/2026-07-05_Race/",
	};
}

function buildWeatherData(): State["WeatherData"] {
	return {
		AirTemp: "21.4",
		Humidity: "58",
		Pressure: "1013.2",
		Rainfall: "0",
		TrackTemp: "38.7",
		WindDirection: "225",
		WindSpeed: "3.2",
	};
}

function buildBaseState(flag: "GREEN" | "YELLOW" | "RED" = "GREEN", type: "Race" | "Qualifying" = "Race"): State {
	return {
		Heartbeat: { Utc: BASE_UTC },
		ExtrapolatedClock: { Utc: BASE_UTC, Remaining: "00:42:15", Extrapolating: true },
		TrackStatus: {
			Status: flag === "GREEN" ? "1" : flag === "YELLOW" ? "2" : "5",
			Message: flag === "GREEN" ? "AllClear" : flag === "YELLOW" ? "Yellow" : "Red",
		},
		SessionStatus: { Status: "Started" },
		LapCount: { CurrentLap: 35, TotalLaps: 52 },
		DriverList: buildDriverList(),
		TimingData: buildTimingData(),
		TimingAppData: buildTimingAppData(),
		WeatherData: buildWeatherData(),
		RaceControlMessages: {
			Messages: [
				{ Utc: BASE_UTC, Lap: 34, Message: "TRACK CLEAR", Category: "Flag", Flag: "GREEN" },
				{
					Utc: BASE_UTC,
					Lap: 33,
					Message: "INCIDENT NOTED - LAPS 30-31",
					Category: "Other",
				},
			],
		},
		SessionInfo: buildSessionInfo(type),
		SessionData: { Series: [{ Utc: BASE_UTC, Lap: 35 }], StatusSeries: [{ Utc: BASE_UTC, TrackStatus: "1" }] },
	};
}

function buildCarsData(): CarsData {
	const data: CarsData = {};
	for (const d of DRIVERS) {
		data[d.num] = {
			Channels: {
				"0": 11500,
				"2": 285,
				"3": 7,
				"4": 95,
				"5": 0,
				"45": 0,
			},
		};
	}
	return data;
}

function buildPositions(): Positions {
	const pos: Positions = {};
	for (let i = 0; i < DRIVERS.length; i++) {
		const angle = (i / DRIVERS.length) * Math.PI * 2;
		pos[DRIVERS[i].num] = {
			Status: "OnTrack",
			X: Math.round(Math.cos(angle) * 500),
			Y: Math.round(Math.sin(angle) * 500),
			Z: 0,
		};
	}
	return pos;
}

export function buildUiFixture(scenario: UiFixtureScenario): UiFixture {
	switch (scenario) {
		case "simple-race":
			return {
				state: buildBaseState("GREEN", "Race"),
				carsData: buildCarsData(),
				positions: buildPositions(),
				generation: "new",
				density: "simple",
				connected: true,
			};

		case "detailed-race":
			return {
				state: buildBaseState("GREEN", "Race"),
				carsData: buildCarsData(),
				positions: buildPositions(),
				generation: "new",
				density: "detailed",
				connected: true,
			};

		case "yellow-flag":
			return {
				state: buildBaseState("YELLOW", "Race"),
				carsData: buildCarsData(),
				positions: buildPositions(),
				generation: "new",
				density: "simple",
				connected: true,
			};

		case "no-session":
			return {
				state: null,
				carsData: null,
				positions: null,
				generation: "new",
				density: "simple",
				connected: true,
			};

		case "disconnected-replay":
			return {
				state: buildBaseState("GREEN", "Race"),
				carsData: null,
				positions: buildPositions(),
				generation: "new",
				density: "simple",
				connected: false,
			};

		case "qualifying":
			return {
				state: buildBaseState("GREEN", "Qualifying"),
				carsData: buildCarsData(),
				positions: buildPositions(),
				generation: "new",
				density: "simple",
				connected: true,
			};

		case "weather":
			return {
				state: buildBaseState("GREEN", "Race"),
				carsData: null,
				positions: null,
				generation: "new",
				density: "detailed",
				connected: true,
			};

		case "archive":
			return {
				state: buildBaseState("GREEN", "Race"),
				carsData: null,
				positions: null,
				generation: "new",
				density: "simple",
				connected: false,
			};
	}
}
