"use client";

import Kpi from "@/components/new-ui/primitives/Kpi";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useDataStore } from "@/stores/useDataStore";

export default function TechnicalWeatherPanel() {
	const weather = useDataStore((state) => state.state?.WeatherData);

	return (
		<Panel title="Weather" eyebrow="Session conditions">
			{!weather ? (
				<ViewState state="unavailable" title="Weather unavailable" description="The live feed has not provided conditions." />
			) : (
				<div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
					<Kpi label="Air" value={weather.AirTemp || "-"} unit={weather.AirTemp ? "°C" : undefined} />
					<Kpi label="Track" value={weather.TrackTemp || "-"} unit={weather.TrackTemp ? "°C" : undefined} />
					<Kpi label="Humidity" value={weather.Humidity || "-"} unit={weather.Humidity ? "%" : undefined} />
					<Kpi label="Wind" value={weather.WindSpeed || "-"} unit={weather.WindSpeed ? "m/s" : undefined} context={weather.Rainfall === "1" ? "Rain detected" : "No rain detected"} />
				</div>
			)}
		</Panel>
	);
}
