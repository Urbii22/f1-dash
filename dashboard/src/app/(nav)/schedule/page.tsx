import { getNext } from "@/components/schedule/NextRound";
import { getSchedule } from "@/components/schedule/Schedule";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleScheduleView, DetailedScheduleView } from "@/components/new-ui/schedule/ScheduleViews";
import LegacySchedulePage from "@/components/schedule/LegacySchedulePage";

export default async function SchedulePage() {
	const [next, schedule] = await Promise.all([getNext(), getSchedule()]);

	return (
		<UiModeBoundary
			legacy={<LegacySchedulePage />}
			simple={<SimpleScheduleView next={next} schedule={schedule} />}
			detailed={<DetailedScheduleView next={next} schedule={schedule} />}
		/>
	);
}
