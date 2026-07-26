import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import DriverDetailDrawer, { DriverDetailDrawerView } from "@/components/new-ui/live/DriverDetailDrawer";
import type { DriverDrawerModel } from "@/lib/view-models/driverDrawer";
import type { State } from "@/types/state.type";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

function baseState(): State {
	return {
		SessionInfo: {
			Meeting: {
				Key: 1,
				Name: "GP",
				OfficialName: "GP",
				Location: "X",
				Country: { Key: 1, Code: "X", Name: "X" },
				Circuit: { Key: 1, ShortName: "X" },
			},
			ArchiveStatus: { Status: "Complete" },
			Key: 1,
			Type: "Race",
			Name: "Race",
			StartDate: "2026-06-15T12:00:00",
			EndDate: "2026-06-15T14:00:00",
			GmtOffset: "00:00:00",
			Path: "2026/x",
		},
		DriverList: {
			"4": {
				RacingNumber: "4",
				BroadcastName: "L NORRIS",
				FullName: "Lando NORRIS",
				Tla: "NOR",
				Line: 2,
				TeamName: "McLaren",
				TeamColour: "F47600",
				FirstName: "Lando",
				LastName: "Norris",
				Reference: "LANNOR01",
				HeadshotUrl: "",
				CountryCode: "GBR",
			},
		},
		TimingData: {
			Lines: {
				"4": {
					GapToLeader: "+5.231",
					Line: 2,
					Position: "2",
					ShowPosition: true,
					RacingNumber: "4",
					Retired: false,
					InPit: false,
					PitOut: false,
					Stopped: false,
					Status: 0,
					Sectors: [],
					Speeds: {} as never,
					BestLapTime: { Value: "1:20.100", Position: 1 },
					LastLapTime: { Value: "1:20.500", Status: 0, OverallFastest: false, PersonalFastest: false },
					NumberOfLaps: 12,
					IntervalToPositionAhead: { Value: "+1.100", Catching: false },
				},
			},
			Withheld: false,
		},
		TimingAppData: {
			Lines: { "4": { RacingNumber: "4", Line: 2, GridPos: "2", Stints: [{ Compound: "MEDIUM", TotalLaps: 12 }] } },
		},
	};
}

const sampleModel: DriverDrawerModel = {
	driverNumber: "4",
	code: "NOR",
	fullName: "Lando NORRIS",
	teamName: "McLaren",
	teamColor: "#F47600",
	positionLabel: "P2",
	gapLabel: "+5.231",
	lastLap: "1:20.500",
	bestLap: "1:20.100",
	stint: { compound: "MEDIUM", age: 12, stops: 0 },
	laps: [],
	paceDirection: null,
	telemetry: { speed: null, gear: null, throttle: null, brake: null, drs: null },
	strategySummary: "MEDIUM tyre, 12 laps · 0 stops",
	alerts: [],
};

beforeEach(() => {
	useDriverSelectionStore.setState({ selectedDriver: null, comparedDrivers: [] });
	useDataStore.setState({ state: null, carsData: null });
});

test("view renders a labelled dialog with the driver name", () => {
	render(<DriverDetailDrawerView model={sampleModel} onClose={() => {}} />);
	expect(screen.getByRole("dialog", { name: /Lando NORRIS/ })).toBeVisible();
	expect(screen.getByText("Lando NORRIS")).toBeVisible();
});

test("view renders nothing when no driver is selected", () => {
	render(<DriverDetailDrawerView model={null} onClose={() => {}} />);
	expect(screen.queryByRole("dialog")).toBeNull();
});

test("closes with the close button and Escape, preserving comparisons", async () => {
	const user = userEvent.setup();
	useDataStore.setState({ state: baseState(), carsData: null });
	useDriverSelectionStore.setState({ selectedDriver: "4", comparedDrivers: ["1", "16"] });

	render(
		<>
			<div data-driver-row="4" tabIndex={0}>
				row
			</div>
			<DriverDetailDrawer />
		</>,
	);

	expect(screen.getByRole("dialog")).toBeVisible();

	await user.keyboard("{Escape}");
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

	expect(useDriverSelectionStore.getState().selectedDriver).toBeNull();
	// comparisons must remain untouched when the drawer closes
	expect(useDriverSelectionStore.getState().comparedDrivers).toEqual(["1", "16"]);
	// focus returns to the originating timing row
	expect(document.querySelector('[data-driver-row="4"]')).toHaveFocus();
});

test("close button dismisses the drawer", async () => {
	const user = userEvent.setup();
	useDataStore.setState({ state: baseState(), carsData: null });
	useDriverSelectionStore.setState({ selectedDriver: "4", comparedDrivers: [] });

	render(<DriverDetailDrawer />);
	expect(screen.getByRole("dialog")).toBeVisible();

	await user.click(screen.getByRole("button", { name: "Close driver details" }));
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	expect(useDriverSelectionStore.getState().selectedDriver).toBeNull();
});
