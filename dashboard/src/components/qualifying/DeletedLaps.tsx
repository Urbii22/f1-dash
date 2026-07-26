"use client";

import { RaceControlMessage } from "@/components/dashboard/RaceControlMessage";
import { filterDeletedLapMessages } from "@/lib/qualiView";
import { useDataStore } from "@/stores/useDataStore";

export default function DeletedLaps() {
	const messages = useDataStore((state) => state.state?.RaceControlMessages?.Messages);
	const gmtOffset = useDataStore((state) => state.state?.SessionInfo?.GmtOffset ?? "00:00:00");
	const deleted = filterDeletedLapMessages(messages);

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">FIA decisions</p>
					<h2 className="text-xl font-black">Deleted Laps</h2>
				</div>
				<span className="data-chip rounded-md px-2 py-1 font-mono text-xs text-orange-200">{deleted.length}</span>
			</div>
			<ul className="tech-scrollbar mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
				{deleted.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">No deleted laps reported.</li>}
				{deleted.map((message) => (
					<RaceControlMessage key={`${message.Utc}-${message.Message}`} msg={message} gmtOffset={gmtOffset} />
				))}
			</ul>
		</section>
	);
}
