"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Navigates to ?season=YYYY (server component re-fetches). Years run from the
 * current season back to 1950 (Ergast/Jolpica coverage).
 */
export default function SeasonSelect({ selected, variant = "legacy" }: { selected: number; variant?: "legacy" | "new" }) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	const current = new Date().getFullYear();
	const years: number[] = [];
	for (let y = current; y >= 1950; y--) years.push(y);

	const onChange = (year: number) => {
		const next = new URLSearchParams(params);
		if (year === current) next.delete("season");
		else next.set("season", String(year));
		const qs = next.toString();
		router.push(qs ? `${pathname}?${qs}` : pathname);
	};

	return (
		<label className="flex items-center gap-2 font-mono text-xs text-zinc-400">
			Season
			<select
				value={selected}
				onChange={(e) => onChange(Number(e.target.value))}
				className={variant === "legacy" ? "data-chip rounded px-2 py-1 text-cyan-200" : "rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] px-2 py-1 text-[var(--ui-text)]"}
			>
				{years.map((y) => (
					<option key={y} value={y}>
						{y}
					</option>
				))}
			</select>
		</label>
	);
}
