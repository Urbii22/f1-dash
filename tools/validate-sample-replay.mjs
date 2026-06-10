import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

const replayPath = resolve("sample-replay", "synthetic-f1-full-grid.data.txt");
const frames = readFileSync(replayPath, "utf8")
	.split(String.fromCharCode(0x1e))
	.map((frame) => frame.trim())
	.filter(Boolean)
	.map(JSON.parse);

const initial = frames.find((frame) => frame.type === 3)?.result;
assert.ok(initial, "missing initial replay state");

const drivers = Object.values(initial.DriverList ?? {});
assert.equal(drivers.length, 22, "replay must contain 22 drivers");
assert.equal(new Set(drivers.map((driver) => driver.TeamName)).size, 11, "replay must contain 11 teams");

const assignments = new Map(drivers.map((driver) => [driver.Tla, driver.TeamName]));
const expectedAssignments = {
	NOR: "McLaren",
	PIA: "McLaren",
	RUS: "Mercedes",
	ANT: "Mercedes",
	VER: "Red Bull Racing",
	HAD: "Red Bull Racing",
	LEC: "Ferrari",
	HAM: "Ferrari",
	ALB: "Williams",
	SAI: "Williams",
	LAW: "Racing Bulls",
	LIN: "Racing Bulls",
	ALO: "Aston Martin",
	STR: "Aston Martin",
	OCO: "Haas F1 Team",
	BEA: "Haas F1 Team",
	HUL: "Audi",
	BOR: "Audi",
	GAS: "Alpine",
	COL: "Alpine",
	BOT: "Cadillac",
	PER: "Cadillac",
};

for (const [tla, team] of Object.entries(expectedAssignments)) {
	assert.equal(assignments.get(tla), team, `${tla} must race for ${team}`);
}

assert.equal(assignments.has("TSU"), false, "Tsunoda must not be in the 2026 race grid fixture");
assert.equal(drivers.some((driver) => driver.TeamName === "Kick Sauber"), false, "Kick Sauber must be replaced by Audi");

const updates = frames.filter((frame) => frame.type === 1 && frame.target === "feed");
const timestamps = updates.map((frame) => Date.parse(frame.arguments?.[2])).filter(Number.isFinite);
assert.ok(timestamps.length > 1, "replay needs timestamped updates");
const elapsedSeconds = (Math.max(...timestamps) - Math.min(...timestamps)) / 1000;
assert.ok(elapsedSeconds >= 450 && elapsedSeconds <= 510, `replay duration must be about 8 minutes, got ${elapsedSeconds}s`);

const raceControlText = JSON.stringify(initial.RaceControlMessages ?? {}) + JSON.stringify(updates.filter((frame) => frame.arguments?.[0] === "RaceControlMessages"));
assert.equal(/DRS/i.test(raceControlText), false, "2026 replay must not contain DRS messages");

const carPayloads = [initial.CarDataZ, ...updates.filter((frame) => frame.arguments?.[0] === "CarDataZ").map((frame) => frame.arguments[1])]
	.filter(Boolean)
	.map((payload) => JSON.parse(inflateRawSync(Buffer.from(payload, "base64")).toString("utf8")));
for (const payload of carPayloads) {
	for (const entry of payload.Entries ?? []) {
		for (const car of Object.values(entry.Cars ?? {})) {
			assert.equal(Object.hasOwn(car.Channels ?? {}, "45"), false, "2026 car frames must omit channel 45");
		}
	}
}

const timeline = new Map();
for (const frame of updates.filter((item) => item.arguments?.[0] === "TimingData")) {
	const timestamp = Date.parse(frame.arguments[2]);
	for (const [number, update] of Object.entries(frame.arguments[1]?.Lines ?? {})) {
		if (Object.hasOwn(update, "InPit") || Object.hasOwn(update, "PitOut")) {
			if (!timeline.has(number)) timeline.set(number, []);
			timeline.get(number).push({ timestamp, inPit: Boolean(update.InPit), pitOut: Boolean(update.PitOut) });
		}
	}
}

const completeSequences = [...timeline.values()].filter((events) => {
	const pitIndex = events.findIndex((event) => event.inPit);
	const pitOutIndex = events.findIndex((event, index) => index > pitIndex && !event.inPit && event.pitOut);
	const clearIndex = events.findIndex((event, index) => index > pitOutIndex && !event.inPit && !event.pitOut);
	if (pitIndex < 0 || pitOutIndex < 0 || clearIndex < 0) return false;
	return events[pitOutIndex].timestamp - events[pitIndex].timestamp >= 20_000 && events[clearIndex].timestamp - events[pitOutIndex].timestamp >= 15_000;
});

assert.ok(completeSequences.length >= 2, "replay must contain two slow PIT -> PIT OUT -> clear sequences");
console.log(`Replay valid: ${drivers.length} drivers, 11 teams, ${elapsedSeconds}s`);
