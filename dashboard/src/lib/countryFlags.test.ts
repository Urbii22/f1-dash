import { describe, expect, it } from "vitest";

import { flagCode } from "@/lib/countryFlags";

describe("flagCode", () => {
	it("maps known country names case- and space-insensitively", () => {
		expect(flagCode("Spain")).toBe("esp");
		expect(flagCode("  netherlands ")).toBe("ned");
		expect(flagCode("Saudi Arabia")).toBe("ksa");
	});

	it("resolves common aliases to the same asset", () => {
		expect(flagCode("UK")).toBe("gbr");
		expect(flagCode("Great Britain")).toBe("gbr");
		expect(flagCode("United States")).toBe("usa");
		expect(flagCode("USA")).toBe("usa");
		expect(flagCode("UAE")).toBe("uae");
	});

	it("returns null for unknown or missing input", () => {
		expect(flagCode(null)).toBeNull();
		expect(flagCode(undefined)).toBeNull();
		expect(flagCode("Atlantis")).toBeNull();
		expect(flagCode("Thailand")).toBeNull(); // no asset
	});
});
