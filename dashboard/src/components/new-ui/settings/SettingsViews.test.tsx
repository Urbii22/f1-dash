import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/components/settings/FavoriteDrivers", () => ({ default: () => <div>Favorite drivers mock</div> }));
vi.mock("@/components/settings/AlertSettings", () => ({ default: () => <div>Alert settings mock</div> }));
vi.mock("@/components/DelayInput", () => ({ default: () => <input aria-label="Delay" /> }));
vi.mock("@/components/DelayTimer", () => ({ default: () => <span>0s</span> }));
vi.mock("@/components/new-ui/InterfaceGenerationToggle", () => ({ default: () => <div>Interface toggle mock</div> }));
vi.mock("@/components/new-ui/DensityToggle", () => ({ default: () => <div>Density toggle mock</div> }));

import { SimpleSettingsView } from "@/components/new-ui/settings/SettingsViews";
import { DetailedSettingsView } from "@/components/new-ui/settings/SettingsViews";
import { useSettingsStore } from "@/stores/useSettingsStore";

beforeEach(() => {
	useSettingsStore.setState({
		carMetrics: false,
		showCornerNumbers: false,
		tableHeaders: true,
		showBestSectors: false,
		showMiniSectors: true,
		qualiShowTheoreticalBest: false,
		qualiShowSpeedTrap: false,
		oledMode: false,
		useSafetyCarColors: false,
		raceControlChime: false,
		raceControlChimeVolume: 0.5,
		speedUnit: "metric",
		delay: 0,
	});
});

test("Simple shows Settings route header", () => {
	render(<SimpleSettingsView />);
	expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("Simple shows Appearance, Alerts, Speed unit, Delay, Favorite drivers panels", () => {
	render(<SimpleSettingsView />);
	expect(screen.getByRole("heading", { name: "Appearance" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Smart alerts" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Speed unit" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Delay" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Favorite drivers" })).toBeVisible();
});

test("Detailed shows same panels as Simple", () => {
	render(<DetailedSettingsView />);
	expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Appearance" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Race control" })).toBeVisible();
});
