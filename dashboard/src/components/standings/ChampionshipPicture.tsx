import type { ChampionshipPictureVM } from "@/lib/view-models/championshipPicture";

// Presentational only (no hooks) so it renders in both the server page and the
// client New-UI views. Neutral dark styling works against legacy and New-UI themes.
export default function ChampionshipPicture({ picture }: { picture: ChampionshipPictureVM | null }) {
	if (!picture) return null;

	return (
		<section className="rounded-lg border border-white/10 bg-white/[0.03] p-4" data-testid="championship-picture">
			<p className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">Championship picture</p>
			<h2 className="mt-1 text-xl font-black text-white">{picture.headline}</h2>
			<p className="mt-1 text-sm text-zinc-400">{picture.subline}</p>

			<ul className="mt-3 flex flex-col gap-1">
				{picture.rows.slice(0, 5).map((row) => (
					<li
						key={row.id}
						className="flex items-center justify-between rounded-md border border-white/5 px-3 py-1.5 text-sm"
					>
						<span className="flex items-center gap-2">
							<strong className="font-mono">{row.code}</strong>
							<span className="text-zinc-400">{row.name}</span>
						</span>
						<span className="flex items-center gap-3">
							<span className="font-mono text-cyan-200">{row.points} pts</span>
							<Status row={row} clinched={picture.clinched} />
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}

function Status({
	row,
	clinched,
}: {
	row: ChampionshipPictureVM["rows"][number];
	clinched: boolean;
}) {
	if (row.isLeader) {
		return (
			<span className="font-mono text-xs text-amber-300">{clinched ? "CHAMPION" : "LEADER"}</span>
		);
	}
	if (!row.canStillWin) {
		return <span className="font-mono text-xs text-zinc-600">OUT</span>;
	}
	return <span className="font-mono text-xs text-zinc-500">-{row.pointsBehind}</span>;
}
