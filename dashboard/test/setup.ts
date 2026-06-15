import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
	cleanup();
});

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
	configurable: true,
	value: ResizeObserverStub,
});

// jsdom lacks matchMedia. Report prefers-reduced-motion so Motion skips enter/exit
// transitions in tests, keeping animated UI deterministic and immediately visible.
Object.defineProperty(globalThis, "matchMedia", {
	configurable: true,
	writable: true,
	value: (query: string) => ({
		matches: query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addListener() {},
		removeListener() {},
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent() {
			return false;
		},
	}),
});
