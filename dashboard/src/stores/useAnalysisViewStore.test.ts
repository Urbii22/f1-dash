import { beforeEach, expect, test } from "vitest";

import { useAnalysisViewStore } from "@/stores/useAnalysisViewStore";

beforeEach(() => {
	useAnalysisViewStore.setState({ activeTab: "pace", selectedDrivers: null });
});

test("shares the active analysis tab across presenters", () => {
	useAnalysisViewStore.getState().setActiveTab("strategy");
	expect(useAnalysisViewStore.getState().activeTab).toBe("strategy");
});

test("keeps an explicit driver selection including an empty selection", () => {
	useAnalysisViewStore.getState().setSelectedDrivers(["4", "81"]);
	expect(useAnalysisViewStore.getState().selectedDrivers).toEqual(["4", "81"]);
	useAnalysisViewStore.getState().setSelectedDrivers([]);
	expect(useAnalysisViewStore.getState().selectedDrivers).toEqual([]);
});
