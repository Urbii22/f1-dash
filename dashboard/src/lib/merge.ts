// PARITY: this mirrors `shared/src/merge.rs::merge`. The Rust backend is the
// canonical implementation that produces the state stream — keep both in sync.
// Covered by merge.test.ts, which shares the Rust test cases.

const isObject = (obj: unknown): obj is Record<string, unknown> => {
	return obj !== null && typeof obj === "object" && !Array.isArray(obj);
};

// Real F1 feed array indices are tiny (grid size, lap/sector counts, message
// lists). Anything beyond this is malformed; padding up to it would blow memory.
const MAX_ARRAY_INDEX = 100_000;

// Match Rust's `key.parse::<usize>()`: non-negative integers only, no sign, no
// trailing junk. Anything else is not a valid array index and the key is ignored.
// Additional safe-divergence from Rust: reject indices that aren't safe integers
// or exceed MAX_ARRAY_INDEX, so a garbage key (e.g. "9".repeat(24) → 1e24) cannot
// drive the null-padding loop into an OOM. Rust would parse such a value as usize
// and hit the same unbounded push, so this guard is strictly safer than 1:1 parity.
const parseIndex = (key: string): number | null => {
	if (!/^\d+$/.test(key)) return null;
	const index = Number(key);
	return Number.isSafeInteger(index) && index <= MAX_ARRAY_INDEX ? index : null;
};

export const merge = (base: unknown, update: unknown): unknown => {
	if (isObject(base) && isObject(update)) {
		const result = { ...base };

		for (const [key, value] of Object.entries(update)) {
			result[key] = merge(base[key] ?? null, value);
		}

		return result;
	}

	if (Array.isArray(base) && isObject(update)) {
		const result = [...base];

		for (const [key, value] of Object.entries(update)) {
			const index = parseIndex(key);
			if (index === null) continue;

			if (index < result.length) {
				result[index] = merge(result[index], value);
			} else {
				while (result.length < index) result.push(null);
				result.push(value);
			}
		}

		return result;
	}

	return update;
};
