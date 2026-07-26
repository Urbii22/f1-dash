import { useEffect, useRef } from "react";

export const useWakeLock = () => {
	const wakeLock = useRef<null | WakeLockSentinel>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		if (!window.isSecureContext) return;

		if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) return;

		if (!("wakeLock" in navigator)) return;

		navigator.wakeLock
			.request("screen")
			.then((wl) => {
				wakeLock.current = wl;
			})
			.catch(() => {
				wakeLock.current = null;
			});

		return () => {
			if (wakeLock.current) {
				wakeLock.current.release();
			}
		};
	}, []);
};
