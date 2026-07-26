import { expect, test, describe } from "vitest";
import { buildUiFixture, type UiFixtureScenario } from "./uiFixtures";

const ALL_SCENARIOS: UiFixtureScenario[] = [
	"simple-race",
	"detailed-race",
	"yellow-flag",
	"no-session",
	"disconnected-replay",
	"qualifying",
	"weather",
	"archive",
];

describe("buildUiFixture", () => {
	test.each(ALL_SCENARIOS)("%s returns a valid fixture", (scenario) => {
		const fixture = buildUiFixture(scenario);
		expect(fixture).toBeDefined();
		expect(["legacy", "new"]).toContain(fixture.generation);
		expect(["simple", "detailed"]).toContain(fixture.density);
		expect(typeof fixture.connected).toBe("boolean");
	});

	test("simple-race has connected state with 20 drivers", () => {
		const { state, connected } = buildUiFixture("simple-race");
		expect(connected).toBe(true);
		expect(state).not.toBeNull();
		expect(Object.keys(state!.DriverList!)).toHaveLength(20);
		expect(Object.keys(state!.TimingData!.Lines)).toHaveLength(20);
	});

	test("no-session has null state", () => {
		const { state, carsData, positions } = buildUiFixture("no-session");
		expect(state).toBeNull();
		expect(carsData).toBeNull();
		expect(positions).toBeNull();
	});

	test("disconnected-replay is not connected", () => {
		const fixture = buildUiFixture("disconnected-replay");
		expect(fixture.connected).toBe(false);
		expect(fixture.state).not.toBeNull();
	});

	test("yellow-flag has YELLOW track status", () => {
		const { state } = buildUiFixture("yellow-flag");
		expect(state!.TrackStatus!.Message).toBe("Yellow");
	});

	test("qualifying has Qualifying session type", () => {
		const { state } = buildUiFixture("qualifying");
		expect(state!.SessionInfo!.Type).toBe("Qualifying");
	});

	test("at least two drivers have missing speed data (unavailable state coverage)", () => {
		const { state } = buildUiFixture("simple-race");
		const lines = Object.values(state!.TimingData!.Lines);
		const missingI1 = lines.filter((l) => l.Speeds.I1.Value === "");
		expect(missingI1.length).toBeGreaterThanOrEqual(2);
	});

	test("detailed-race uses detailed density", () => {
		expect(buildUiFixture("detailed-race").density).toBe("detailed");
	});
});
