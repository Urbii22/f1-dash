"use client";

import { useEffect } from "react";

// Registers the service worker after load. No-op where unsupported. Network-first
// caching in sw.js keeps this safe alongside dev HMR (hashed assets only are cached).
export default function ServiceWorkerRegister() {
	useEffect(() => {
		if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

		const register = () => {
			void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
		};

		if (document.readyState === "complete") {
			register();
			return;
		}
		window.addEventListener("load", register);
		return () => window.removeEventListener("load", register);
	}, []);

	return null;
}
