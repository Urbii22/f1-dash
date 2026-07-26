"use client";

import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleSettingsView, DetailedSettingsView } from "@/components/new-ui/settings/SettingsViews";
import LegacySettingsPage from "@/components/settings/LegacySettingsPage";

export default function SettingsPage() {
	return (
		<UiModeBoundary
			legacy={<LegacySettingsPage />}
			simple={<SimpleSettingsView />}
			detailed={<DetailedSettingsView />}
		/>
	);
}
