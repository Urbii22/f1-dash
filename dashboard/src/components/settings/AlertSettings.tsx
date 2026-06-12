"use client";

import { useEffect, useState } from "react";

import { ALERT_RULE_IDS, ALERT_RULE_LABELS } from "@/lib/alerts/types";
import { notificationsSupported, requestNotificationPermission } from "@/lib/alerts/notifications";
import { useAlertStore } from "@/stores/useAlertStore";

import Toggle from "@/components/ui/Toggle";

export default function AlertSettings() {
	const [notificationsAvailable, setNotificationsAvailable] = useState(false);
	const enabledRules = useAlertStore((store) => store.enabledRules);
	const setRuleEnabled = useAlertStore((store) => store.setRuleEnabled);
	const favoritesOnly = useAlertStore((store) => store.favoritesOnly);
	const setFavoritesOnly = useAlertStore((store) => store.setFavoritesOnly);
	const browserNotifications = useAlertStore((store) => store.browserNotifications);
	const setBrowserNotifications = useAlertStore((store) => store.setBrowserNotifications);

	useEffect(() => {
		setNotificationsAvailable(notificationsSupported());
	}, []);

	const handleNotificationsToggle = async (enabled: boolean) => {
		if (!enabled) {
			setBrowserNotifications(false);
			return;
		}
		const granted = await requestNotificationPermission();
		setBrowserNotifications(granted);
	};

	return (
		<div>
			<div className="flex flex-col gap-2">
				{ALERT_RULE_IDS.map((rule) => (
					<div key={rule} className="flex gap-2">
						<Toggle enabled={enabledRules[rule] !== false} setEnabled={(v) => setRuleEnabled(rule, v)} />
						<p className="text-zinc-500">{ALERT_RULE_LABELS[rule]}</p>
					</div>
				))}
			</div>

			<div className="mt-4 flex gap-2">
				<Toggle enabled={favoritesOnly} setEnabled={setFavoritesOnly} />
				<p className="text-zinc-500">Only show driver alerts for favorite drivers</p>
			</div>

			<div className="mt-2 flex gap-2">
				<Toggle enabled={browserNotifications} setEnabled={(v) => void handleNotificationsToggle(v)} />
				<p className="text-zinc-500">
					Browser notifications for important alerts when the tab is in the background
					{!notificationsAvailable && " (not supported by this browser)"}
				</p>
			</div>
		</div>
	);
}
