import { notFound } from "next/navigation";
import UiFixtureHarness from "@/components/new-ui/fixtures/UiFixtureHarness";
import { buildUiFixture, type UiFixtureScenario } from "@/lib/fixtures/uiFixtures";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import LiveDashboardState from "@/components/new-ui/live/LiveDashboardState";

const VALID_SCENARIOS: Set<string> = new Set([
	"simple-race",
	"detailed-race",
	"yellow-flag",
	"no-session",
	"disconnected-replay",
	"qualifying",
	"weather",
	"archive",
]);

export default async function UiFixturePage({ params }: { params: Promise<{ scenario: string }> }) {
	if (process.env.UI_FIXTURES !== "1") {
		notFound();
	}

	const { scenario } = await params;

	if (!VALID_SCENARIOS.has(scenario)) {
		notFound();
	}

	const fixture = buildUiFixture(scenario as UiFixtureScenario);

	return (
		<UiFixtureHarness fixture={fixture}>
			<div data-ui-generation={fixture.generation} data-ui-density={fixture.density}>
				<UiModeBoundary
					legacy={<div data-testid="legacy-shell">Legacy shell (fixture)</div>}
					simple={<LiveDashboardState density="simple" />}
					detailed={<LiveDashboardState density="detailed" />}
				/>
			</div>
		</UiFixtureHarness>
	);
}
