import clsx from "clsx";

import type { DriverStatus as DriverStatusModel } from "@/lib/driverStatus";

type Props = {
	status: DriverStatusModel;
};

export default function DriverStatus({ status }: Props) {
	return (
		<span
			data-driver-status={status.kind}
			className={clsx(
				"inline-flex h-8 w-full items-center justify-center rounded-md border-2 font-mono text-xs font-black whitespace-nowrap",
				{
					"border-transparent text-transparent": status.kind === "none",
					"border-zinc-700 text-zinc-700": status.kind === "drs-off",
					"border-zinc-400 text-zinc-400": status.kind === "drs-ready",
					"border-emerald-500 text-emerald-500": status.kind === "drs-active",
					"border-cyan-500 text-cyan-500": status.kind === "pit",
					"border-blue-400 text-blue-400": status.kind === "pit-out",
				},
			)}
		>
			{status.label || "-"}
		</span>
	);
}
