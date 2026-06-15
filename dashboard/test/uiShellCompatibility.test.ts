import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
	return readFileSync(path.join(root, rel), "utf8");
}

const dashboardLayout = "src/app/dashboard/layout.tsx";

const migratedLayouts = [
	{ file: "src/app/dashboard/layout.tsx", shell: "NewUiDashboardShell", routeName: "Dashboard" },
	{ file: "src/app/(nav)/layout.tsx", shell: "NewUiPublicShell", routeName: "Pages" },
	{ file: "src/app/archive/layout.tsx", shell: "NewUiPublicShell", routeName: "Archive" },
	{ file: "src/app/results/layout.tsx", shell: "NewUiPublicShell", routeName: "Results" },
	{ file: "src/app/h2h/layout.tsx", shell: "NewUiPublicShell", routeName: "Head to Head" },
	{ file: "src/app/driver/layout.tsx", shell: "NewUiPublicShell", routeName: "Driver" },
];

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

	it("routes every migrated layout through the reversible mode boundary", () => {
		for (const { file } of migratedLayouts) {
			const src = read(file);
			expect(src, `${file} must use UiModeBoundary`).toContain("UiModeBoundary");
		}
	});

	it("imports a New UI shell in every migrated layout", () => {
		for (const { file, shell } of migratedLayouts) {
			const src = read(file);
			expect(src, `${file} must import ${shell}`).toContain(shell);
		}
	});

	it("wraps unmigrated route content in the compatibility boundary", () => {
		for (const { file, routeName } of migratedLayouts) {
			const src = read(file);
			expect(src, `${file} must use NewUiCompatibilityBoundary`).toContain("NewUiCompatibilityBoundary");
			expect(src, `${file} must name the route "${routeName}"`).toContain(`routeName="${routeName}"`);
		}
	});

	it("bypasses the compatibility notice on the migrated live dashboard", () => {
		const src = read(dashboardLayout);
		expect(src).toContain("usePathname");
		expect(src).toContain("newUiNativeRoutes.has(pathname)");
		expect(src).toContain('"/dashboard"');
		expect(src).toContain('"/dashboard/qualifying"');
		expect(src).toContain('"/dashboard/analysis"');
		expect(src).toContain('"/dashboard/standings"');
	});
});
