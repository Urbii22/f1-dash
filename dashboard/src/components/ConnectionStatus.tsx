"use client";

import clsx from "clsx";

type Props = {
	connected?: boolean;
};

export default function ConnectionStatus({ connected }: Props) {
	return (
		<div
			className={clsx(
				"size-3 rounded-full ring-4",
				connected
					? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)] ring-emerald-400/15"
					: "animate-pulse bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.8)] ring-rose-500/15",
			)}
		/>
	);
}
