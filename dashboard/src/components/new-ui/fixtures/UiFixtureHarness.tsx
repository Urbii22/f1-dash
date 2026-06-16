"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useDataStore } from "@/stores/useDataStore";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";
import type { UiFixture } from "@/lib/fixtures/uiFixtures";

export default function UiFixtureHarness({ fixture, children }: { fixture: UiFixture; children: ReactNode }) {
	const { setState, setCarsData, setPositions } = useDataStore();
	const { setConnected } = useConnectionStore();
	const { setGeneration, setDensity, setHydrated } = useUiPreferencesStore();

	useEffect(() => {
		setState(fixture.state);
		setCarsData(fixture.carsData);
		setPositions(fixture.positions);
		setConnected(fixture.connected);
		setGeneration(fixture.generation);
		setDensity(fixture.density);
		setHydrated(true);

		return () => {
			setState(null);
			setCarsData(null);
			setPositions(null);
			setConnected(false);
		};
	}, [fixture, setState, setCarsData, setPositions, setConnected, setGeneration, setDensity, setHydrated]);

	return <>{children}</>;
}
