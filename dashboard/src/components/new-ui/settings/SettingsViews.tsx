"use client";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import SegmentedControls from "@/components/ui/SegmentedControls";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import FavoriteDrivers from "@/components/settings/FavoriteDrivers";
import AlertSettings from "@/components/settings/AlertSettings";
import DelayInput from "@/components/DelayInput";
import DelayTimer from "@/components/DelayTimer";
import { useSettingsStore } from "@/stores/useSettingsStore";
import DensityToggle from "@/components/new-ui/DensityToggle";
import InterfaceGenerationToggle from "@/components/new-ui/InterfaceGenerationToggle";

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--ui-border)] last:border-0">
			<div className="min-w-0">
				<p className="text-sm font-medium text-[var(--ui-text)]">{label}</p>
				{description && <p className="mt-0.5 text-xs text-[var(--ui-muted)]">{description}</p>}
			</div>
			<div className="flex-shrink-0">{children}</div>
		</div>
	);
}

function AppearancePanel() {
	const settings = useSettingsStore();
	return (
		<Panel title="Appearance" eyebrow="Visual options" level="primary">
			<SettingRow label="Car metrics" description="RPM, gear, and speed in the timing board">
				<Toggle label="Car metrics" enabled={settings.carMetrics} setEnabled={(v) => settings.setCarMetrics(v)} />
			</SettingRow>
			<SettingRow label="Corner numbers" description="Annotate corners on the track map">
				<Toggle label="Corner numbers" enabled={settings.showCornerNumbers} setEnabled={(v) => settings.setShowCornerNumbers(v)} />
			</SettingRow>
			<SettingRow label="Driver table header">
				<Toggle label="Driver table header" enabled={settings.tableHeaders} setEnabled={(v) => settings.setTableHeaders(v)} />
			</SettingRow>
			<SettingRow label="Best sectors" description="Show each driver's best sector times">
				<Toggle label="Best sectors" enabled={settings.showBestSectors} setEnabled={(v) => settings.setShowBestSectors(v)} />
			</SettingRow>
			<SettingRow label="Mini sectors">
				<Toggle label="Mini sectors" enabled={settings.showMiniSectors} setEnabled={(v) => settings.setShowMiniSectors(v)} />
			</SettingRow>
			<SettingRow label="Theoretical best in qualifying">
				<Toggle label="Theoretical best in qualifying" enabled={settings.qualiShowTheoreticalBest} setEnabled={(v) => settings.setQualiShowTheoreticalBest(v)} />
			</SettingRow>
			<SettingRow label="Speed trap in qualifying">
				<Toggle label="Speed trap in qualifying" enabled={settings.qualiShowSpeedTrap} setEnabled={(v) => settings.setQualiShowSpeedTrap(v)} />
			</SettingRow>
			<SettingRow label="OLED mode" description="Pure black background">
				<Toggle label="OLED mode" enabled={settings.oledMode} setEnabled={(v) => settings.setOledMode(v)} />
			</SettingRow>
			<SettingRow label="Safety car colors">
				<Toggle label="Safety car colors" enabled={settings.useSafetyCarColors} setEnabled={(v) => settings.setUseSafetyCarColors(v)} />
			</SettingRow>
		</Panel>
	);
}

function RaceControlPanel() {
	const settings = useSettingsStore();
	return (
		<Panel title="Race control" eyebrow="Audio and alerts">
			<SettingRow label="Chime on Race Control message">
				<Toggle label="Chime on Race Control message" enabled={settings.raceControlChime} setEnabled={(v) => settings.setRaceControlChime(v)} />
			</SettingRow>
			{settings.raceControlChime && (
				<div className="flex items-center gap-3 py-3">
					<Input
						value={String(settings.raceControlChimeVolume)}
						setValue={(v) => {
							const n = Number(v);
							if (!isNaN(n)) settings.setRaceControlChimeVolume(n);
						}}
					/>
					<Slider className="!w-40" value={settings.raceControlChimeVolume} setValue={(v) => settings.setRaceControlChimeVolume(v)} />
					<span className="text-sm text-[var(--ui-muted)]">Volume</span>
				</div>
			)}
		</Panel>
	);
}

function DelayPanel() {
	const settings = useSettingsStore();
	return (
		<Panel title="Delay" eyebrow="Stream sync">
			<p className="mt-1 mb-3 text-sm text-[var(--ui-muted)]">
				Delays the dashboard feed so it matches your broadcast stream. Maximum delay equals time spent on the live page.
			</p>
			<div className="flex items-center gap-3">
				<DelayTimer />
				<DelayInput />
				<span className="text-sm text-[var(--ui-muted)]">seconds</span>
			</div>
			<Button className="mt-3 bg-red-600!" onClick={() => settings.setDelay(0)}>Reset delay</Button>
		</Panel>
	);
}

function InterfacePanel() {
	return (
		<Panel title="Interface" eyebrow="Generation and density">
			<div className="mt-2 flex flex-col gap-3">
				<div>
					<p className="mb-1 text-xs text-[var(--ui-muted)]">Generation</p>
					<InterfaceGenerationToggle />
				</div>
				<div>
					<p className="mb-1 text-xs text-[var(--ui-muted)]">Density</p>
					<DensityToggle />
				</div>
			</div>
		</Panel>
	);
}

export function SimpleSettingsView() {
	const settings = useSettingsStore();
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader eyebrow="Preferences" title="Settings" description="Appearance, alerts, favorite drivers, speed unit, and stream delay." />

			<div className="grid gap-4 xl:grid-cols-2">
				<InterfacePanel />
				<AppearancePanel />
				<Panel title="Smart alerts" eyebrow="Race events">
					<p className="mt-1 mb-3 text-sm text-[var(--ui-muted)]">Choose which race events generate in-dashboard alerts.</p>
					<AlertSettings />
				</Panel>
				<Panel title="Speed unit" eyebrow="Display preference">
					<div className="mt-2">
						<SegmentedControls
							id="speed-unit"
							selected={settings.speedUnit}
							onSelect={settings.setSpeedUnit}
							options={[
								{ label: "km/h", value: "metric" },
								{ label: "mp/h", value: "imperial" },
							]}
						/>
					</div>
				</Panel>
				<DelayPanel />
				<Panel title="Favorite drivers" eyebrow="Highlight preference">
					<p className="mt-1 mb-3 text-sm text-[var(--ui-muted)]">Highlighted on the leaderboard throughout the session.</p>
					<FavoriteDrivers />
				</Panel>
			</div>
		</div>
	);
}

export function DetailedSettingsView() {
	const settings = useSettingsStore();
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader eyebrow="Preferences" title="Settings" description="All options across appearance, race control, alerts, drivers, speed unit, and stream delay." />

			<div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
				<div className="flex flex-col gap-4">
					<InterfacePanel />
					<AppearancePanel />
				</div>
				<div className="flex flex-col gap-4">
					<RaceControlPanel />
					<Panel title="Smart alerts" eyebrow="Race events">
						<p className="mt-1 mb-3 text-sm text-[var(--ui-muted)]">Choose which race events generate in-dashboard alerts.</p>
						<AlertSettings />
					</Panel>
				</div>
				<div className="flex flex-col gap-4">
					<Panel title="Speed unit" eyebrow="Display preference">
						<div className="mt-2">
							<SegmentedControls
								id="speed-unit-detailed"
								selected={settings.speedUnit}
								onSelect={settings.setSpeedUnit}
								options={[
									{ label: "km/h", value: "metric" },
									{ label: "mp/h", value: "imperial" },
								]}
							/>
						</div>
					</Panel>
					<DelayPanel />
					<Panel title="Favorite drivers" eyebrow="Highlight preference">
						<FavoriteDrivers />
					</Panel>
				</div>
			</div>
		</div>
	);
}
