import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
	return readFileSync(path.join(root, rel), "utf8");
}

const dashboardLayout = "src/app/dashboard/layout.tsx";
const globalsCss = "src/styles/globals.css";
const serviceWorkerRegister = "src/components/ServiceWorkerRegister.tsx";
const serviceWorker = "public/sw.js";
const rootLayout = "src/app/layout.tsx";

describe("UI shell compatibility", () => {
	it("keeps dashboard live runtime hooks outside the Legacy shell", () => {
		const src = read(dashboardLayout);
		const legacyShellIndex = src.indexOf("function LegacyDashboardShell");
		expect(legacyShellIndex).toBeGreaterThan(-1);

		for (const hook of ["useDataEngine(", "useSocket(", "useWakeLock(", "useStores("]) {
			const hookIndex = src.indexOf(hook);
			expect(hookIndex, `${hook} must be present`).toBeGreaterThan(-1);
			expect(hookIndex, `${hook} must run before the Legacy shell`).toBeLessThan(legacyShellIndex);
		}
	});

	it("mounts the Legacy sidebar only inside the Legacy dashboard branch", () => {
		const src = read(dashboardLayout);
		const legacyShellIndex = src.indexOf("function LegacyDashboardShell");
		const sidebarIndex = src.indexOf("<Sidebar");
		expect(sidebarIndex).toBeGreaterThan(-1);
		expect(sidebarIndex).toBeGreaterThan(legacyShellIndex);
	});

	it("dashboard layout does not import New UI shells or compatibility wrappers", () => {
		const src = read(dashboardLayout);
		expect(src).not.toContain("NewUiCompatibilityBoundary");
		expect(src).not.toContain("NewUiDashboardShell");
		expect(src).not.toContain("newUiNativeRoutes");
	});

	it("root layout does not mount New UI preference sync or toggle controls", () => {
		const src = read(rootLayout);
		expect(src).not.toContain("UiPreferenceSync");
		expect(src).not.toContain("InterfaceGenerationToggle");
	});

	it("allows scrolling in the New UI document shell and panel bodies", () => {
		const css = read(globalsCss);
		const shellBlock = css.match(/\.new-ui-app-shell\s*{(?<body>[^}]*)}/s)?.groups?.body ?? "";

		expect(css).toMatch(/body\[data-ui-generation="new"\]\s*{[^}]*overflow-y:\s*auto;/s);
		expect(shellBlock).toMatch(/^\s*min-height:\s*100dvh;/m);
		expect(shellBlock).not.toMatch(/^\s*height:\s*100dvh;/m);
		expect(css).toMatch(/\.new-ui-panel__body\s*{[^}]*overflow:\s*auto;/s);
	});

	it("does not keep a stale service worker active in local development", () => {
		const registerSrc = read(serviceWorkerRegister);
		const swSrc = read(serviceWorker);
		expect(registerSrc).toContain('process.env.NODE_ENV !== "production"');
		expect(registerSrc).toContain("registration.unregister()");
		expect(registerSrc).toContain("caches.delete");
		expect(swSrc).toContain('const CACHE = "f1dash-v2"');
		expect(swSrc).toContain('url.hostname === "localhost"');
		expect(swSrc).toContain("event.respondWith(fetch(request))");
	});
});
