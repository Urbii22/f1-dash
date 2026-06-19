// PARITY: this mirrors `shared/src/merge.rs::merge` exactly. The Rust backend is the
// canonical implementation that produces the state stream — keep both in sync.
// Covered by merge.test.ts, which shares the Rust test cases.

const isObject = (obj: unknown): obj is Record<string, unknown> => {
	return obj !== null && typeof obj === "object" && !Array.isArray(obj);
};

// Match Rust's `key.parse::<usize>()`: non-negative integers only, no sign, no
// trailing junk. Anything else is not a valid array index and the key is ignored.
const parseIndex = (key: string): number | null => {
	return /^\d+$/.test(key) ? Number(key) : null;
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
