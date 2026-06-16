"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useDataStore } from "@/stores/useDataStore";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";
import type { UiFixture } from "@/lib/fixtures/uiFixtures";

export default function UiFixtureHarness({ fixture, children }: { fixture: UiFixture; children: ReactNode }) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		useDataStore.setState({ state: fixture.state, carsData: fixture.carsData, positions: fixture.positions });
		useConnectionStore.setState({ connected: fixture.connected });
		useUiPreferencesStore.setState({
			generation: fixture.generation,
			density: fixture.density,
			hydrated: true,
		});
		setReady(true);

		return () => {
			setReady(false);
			useDataStore.setState({ state: null, carsData: null, positions: null });
			useConnectionStore.setState({ connected: false });
		};
	}, [fixture]);

	return <div data-ui-ready={ready ? "true" : "false"}>{ready ? children : null}</div>;
}
