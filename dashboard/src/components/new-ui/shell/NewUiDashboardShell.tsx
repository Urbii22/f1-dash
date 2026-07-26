"use client";

import type { ReactNode } from "react";

import NewUiSidebar from "@/components/new-ui/shell/NewUiSidebar";
import ConnectedNewUiSessionBar from "@/components/new-ui/shell/NewUiSessionBar";
import DensityToggle from "@/components/new-ui/DensityToggle";

export default function NewUiDashboardShell({ children }: { children: ReactNode }) {
	return (
		<div className="new-ui-app-shell">
			<NewUiSidebar />
			<div className="new-ui-workspace">
				<div className="new-ui-workspace__bar">
					<ConnectedNewUiSessionBar />
					<DensityToggle />
				</div>
				<main className="new-ui-workspace__main">{children}</main>
			</div>
		</div>
	);
}
