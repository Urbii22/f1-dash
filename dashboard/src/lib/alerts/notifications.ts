import type { AlertEvent } from "@/lib/alerts/types";

export function notificationsSupported(): boolean {
	return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
	if (!notificationsSupported()) return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	const result = await Notification.requestPermission();
	return result === "granted";
}

/**
 * Native browser notification for important alerts. Only fires when the tab is
 * hidden — the in-app feed and toasts cover the visible case — and only for
 * warning/critical severity.
 */
export function notifyAlert(event: AlertEvent): void {
	if (!notificationsSupported()) return;
	if (Notification.permission !== "granted") return;
	if (document.visibilityState !== "hidden") return;
	if (event.severity === "info") return;

	try {
		new Notification(`f1-dash · ${event.title}`, {
			body: event.body,
			tag: event.id,
			icon: "/tag-logo.png",
		});
	} catch {
		// Notification constructor can throw on some platforms (e.g. Android); ignore
	}
}
