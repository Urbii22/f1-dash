const MIN_DASHBOARD_SPLIT = 38;
const MAX_DASHBOARD_SPLIT = 70;

export function clampDashboardSplit(value: number) {
	if (!Number.isFinite(value)) return 50;
	return Math.min(MAX_DASHBOARD_SPLIT, Math.max(MIN_DASHBOARD_SPLIT, value));
}

export function dashboardSplitFromPointer({
	pointerX,
	containerLeft,
	containerWidth,
}: {
	pointerX: number;
	containerLeft: number;
	containerWidth: number;
}) {
	if (containerWidth <= 0) return 50;
	const percentage = ((pointerX - containerLeft) / containerWidth) * 100;
	return Math.round(clampDashboardSplit(percentage) * 100) / 100;
}

export const dashboardSplitBounds = {
	min: MIN_DASHBOARD_SPLIT,
	max: MAX_DASHBOARD_SPLIT,
};
