import { clsx } from "clsx";
import Image from "next/image";

import { flagCode } from "@/lib/countryFlags";

// Inline race-location flag. Renders nothing when the country has no asset, so
// callers can drop it in unconditionally.
export default function CountryFlag({
	country,
	className,
}: {
	country: string | null | undefined;
	className?: string;
}) {
	const code = flagCode(country);
	if (!code) return null;

	return (
		<Image
			src={`/country-flags/${code}.svg`}
			alt={`${country} flag`}
			width={20}
			height={15}
			className={clsx("inline-block rounded-[2px]", className)}
		/>
	);
}
