import { WeatherMap } from "@/app/dashboard/weather/map";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import SimpleWeatherView from "@/components/new-ui/weather/SimpleWeatherView";
import DetailedWeatherView from "@/components/new-ui/weather/DetailedWeatherView";

export default function WeatherPage() {
	return <UiModeBoundary legacy={<LegacyWeatherPage />} simple={<SimpleWeatherView />} detailed={<DetailedWeatherView />} />;
}

export function LegacyWeatherPage() {
	// calc height is a workaround, maybe think about refactoring sometime
	return (
		<div className="relative h-[calc(100%-142px)] w-full md:h-full">
			<WeatherMap />
		</div>
	);
}
