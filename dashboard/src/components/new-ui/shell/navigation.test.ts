import { describe, expect, it } from "vitest";
import { newUiNavigation, isNavItemActive } from "@/components/new-ui/shell/navigation";

describe("newUiNavigation", () => {
	it("defines the four destination groups in order", () => {
		expect(newUiNavigation.map((group) => group.label)).toEqual(["Live", "Analysis", "History", "System"]);
	});

	it("groups the expected routes", () => {
		const live = newUiNavigation.find((group) => group.label === "Live");
		expect(live?.items).toContain("/dashboard");
		expect(live?.items).toContain("/dashboard/track-map");
	});
});

describe("isNavItemActive", () => {
	it("matches /dashboard exactly and does not match nested live routes", () => {
		expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
		expect(isNavItemActive("/dashboard", "/dashboard/qualifying")).toBe(false);
	});

	it("matches root exactly", () => {
		expect(isNavItemActive("/", "/")).toBe(true);
		expect(isNavItemActive("/", "/dashboard")).toBe(false);
	});

	it("prefix matches dynamic history and profile routes", () => {
		expect(isNavItemActive("/archive", "/archive/2026-monaco")).toBe(true);
		expect(isNavItemActive("/results", "/results/8")).toBe(true);
		expect(isNavItemActive("/h2h", "/h2h")).toBe(true);
	});

	it("does not treat a sibling route as active", () => {
		expect(isNavItemActive("/results", "/resultsx")).toBe(false);
	});
});
