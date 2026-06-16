"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useReplayControlStore } from "@/stores/useReplayControlStore";

import StatusBadge from "@/components/new-ui/primitives/StatusBadge";
import { buildSessionBarModel, type SessionBarModel } from "@/lib/view-models/sessionBar";

export function NewUiSessionBar({ model }: { model: SessionBarModel }) {
	return (
		<header className="new-ui-session-bar" aria-label="Session context">
			<div className="new-ui-session-bar__identity">
				<p className="new-ui-session-bar__event">{model.eventName}</p>
				<p className="new-ui-session-bar__session">{model.sessionName}</p>
			</div>

			<div className="new-ui-session-bar__timing">
				<p className="new-ui-session-bar__clock new-ui-number">{model.clock}</p>
				{model.lapLabel ? <p className="new-ui-session-bar__lap new-ui-number">{model.lapLabel}</p> : null}
			</div>

			<div className="new-ui-session-bar__status">
				<StatusBadge tone={model.trackStatus.tone} label={model.trackStatus.label} />
				<StatusBadge
					tone={model.connectionLabel === "Live" ? "green" : "neutral"}
					label={model.connectionLabel}
				/>
				{model.weatherLabel ? <span className="new-ui-session-bar__weather">{model.weatherLabel}</span> : null}
			</div>
		</header>
	);
}

export default function ConnectedNewUiSessionBar() {
	const state = useDataStore((store) => store.state ?? null);
	const connected = useConnectionStore((store) => store.connected);
	const delay = useSettingsStore((store) => store.delay);
	const replayPaused = useReplayControlStore((store) => store.isPaused);

	if (!state?.SessionInfo) return null;

	const model = buildSessionBarModel({
		state,
		connected,
		delaySeconds: delay,
		replayPaused,
	});

	return <NewUiSessionBar model={model} />;
}
