import { describe, expect, it } from "vitest";

import { merge } from "@/lib/merge";

// These cases are kept in parity with `shared/src/merge.rs` (the canonical Rust
// implementation). If a case changes here, change it there too.
describe("merge (parity with shared/src/merge.rs)", () => {
	it("deep merges nested objects", () => {
		expect(merge({ timing: { laps: 2, position: 1 } }, { timing: { laps: 3 } })).toEqual({
			timing: { laps: 3, position: 1 },
		});
	});

	it("applies numeric object keys to arrays, padding gaps with null", () => {
		expect(merge([{ value: 1 }, { value: 2 }], { "1": { extra: true }, "3": { value: 4 } })).toEqual([
			{ value: 1 },
			{ value: 2, extra: true },
			null,
			{ value: 4 },
		]);
	});

	it("overwrites scalar values", () => {
		expect(merge({ status: "Started" }, { status: "Finished" })).toEqual({ status: "Finished" });
	});

	it("overwrites when types mismatch (array base, scalar update)", () => {
		expect(merge([1, 2], "done")).toBe("done");
		expect(merge({ a: 1 }, [3])).toEqual([3]);
	});

	// Rust `key.parse::<usize>()` rejects these, so the key is ignored — no lenient
	// parseInt() coercion, no negative-index splice, no NaN-to-zero fallback.
	it("ignores array keys that are not valid usize indices", () => {
		expect(merge([{ value: 1 }], { "0x": { value: 9 }, foo: { value: 9 }, "-1": { value: 9 } })).toEqual([
			{ value: 1 },
		]);
	});

	// Guard against absurd indices: a huge numeric key must not drive the
	// null-padding loop into an OOM. Such keys are ignored, fast and bounded.
	it("ignores absurdly large array indices without allocating", () => {
		const huge = "9".repeat(24); // Number(huge) === 1e24, finite but nonsense
		const start = performance.now();
		const out = merge([{ value: 1 }], { [huge]: { value: 9 }, "100001": { value: 9 } });
		expect(out).toEqual([{ value: 1 }]);
		expect(performance.now() - start).toBeLessThan(100);
	});
});
