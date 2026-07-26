import { expect, test, describe } from "vitest";
import { resolveViewState } from "./viewState";

describe("resolveViewState priority: loading > error > unavailable > empty > ready", () => {
	test("loading wins over everything", () => {
		expect(resolveViewState({ loading: true, error: new Error(), available: false, empty: true })).toBe("loading");
	});

	test("error wins when not loading", () => {
		expect(resolveViewState({ loading: false, error: new Error("oops"), available: true, empty: false })).toBe("error");
	});

	test("unavailable wins when no loading/error", () => {
		expect(resolveViewState({ loading: false, available: false, empty: true })).toBe("unavailable");
	});

	test("empty wins when available but no items", () => {
		expect(resolveViewState({ loading: false, available: true, empty: true })).toBe("empty");
	});

	test("ready when all clear", () => {
		expect(resolveViewState({ loading: false, available: true, empty: false })).toBe("ready");
	});

	test("undefined error treated as no error", () => {
		expect(resolveViewState({ loading: false, error: undefined, available: true, empty: false })).toBe("ready");
	});

	test("null error treated as no error", () => {
		expect(resolveViewState({ loading: false, error: null, available: true, empty: false })).toBe("ready");
	});
});
