import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleHelpView, DetailedHelpView } from "@/components/new-ui/help/HelpViews";
import LegacyHelpPage from "@/components/help/LegacyHelpPage";

export default function HelpPage() {
	return (
		<UiModeBoundary
			legacy={<LegacyHelpPage />}
			simple={<SimpleHelpView />}
			detailed={<DetailedHelpView />}
		/>
	);
}
