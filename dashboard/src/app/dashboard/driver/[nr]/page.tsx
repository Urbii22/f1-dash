import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import ViewState from "@/components/new-ui/primitives/ViewState";

export default function DriverPage() {
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Live driver focus"
				title="Driver detail"
				description="Focused live telemetry view for a selected driver."
			/>
			<ViewState
				state="unavailable"
				title="Driver live detail unavailable"
				description="This live route is reserved for the upcoming focused driver telemetry view."
			/>
		</div>
	);
}
