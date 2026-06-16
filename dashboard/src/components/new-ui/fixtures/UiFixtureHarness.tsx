"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useDataStore } from "@/stores/useDataStore";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";
import type { UiFixture } from "@/lib/fixtures/uiFixtures";

function applyFixture(fixture: UiFixture) {
	useDataStore.setState({ state: fixture.state, carsData: fixture.carsData, positions: fixture.positions });
	useConnectionStore.setState({ connected: fixture.connected });
	useUiPreferencesStore.setState({
		generation: fixture.generation,
		density: fixture.density,
		hydrated: true,
	});
}

export default function UiFixtureHarness({ fixture, children }: { fixture: UiFixture; children: ReactNode }) {
	// Populate the stores synchronously on first render so children always observe fixture data
	// and the readiness flag is true on first paint (E2E waits on data-ui-ready).
	const [ready] = useState(() => {
		applyFixture(fixture);
		return true;
	});

	useEffect(() => {
		applyFixture(fixture);
		return () => {
			useDataStore.setState({ state: null, carsData: null, positions: null });
			useConnectionStore.setState({ connected: false });
		};
	}, [fixture]);

	return <div data-ui-ready={ready ? "true" : "false"}>{ready ? children : null}</div>;
}
