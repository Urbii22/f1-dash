// Serialize chart series to CSV (long format: one row per point). Pure + tested.
// The DOM download helper lives alongside but is browser-guarded.

export type ExportSeries = { label: string; points: { x: number; y: number }[] };

function escapeCsv(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function seriesToCsv(
	series: ExportSeries[],
	headers: { series: string; x: string; y: string } = { series: "series", x: "x", y: "y" },
): string {
	const lines = [`${headers.series},${headers.x},${headers.y}`];
	for (const entry of series) {
		for (const point of entry.points) {
			lines.push(`${escapeCsv(entry.label)},${point.x},${point.y}`);
		}
	}
	return lines.join("\n");
}

/** Trigger a client-side download of `content` as `filename`. No-op outside the browser. */
export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
	if (typeof document === "undefined") return;
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
