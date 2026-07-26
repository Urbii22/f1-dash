// Maps a race-location country name (from Jolpica results or the iCal schedule)
// to the 3-letter code of a flag asset in /public/country-flags. The asset set
// covers calendar countries only — driver nationalities are intentionally not
// handled here (no asset coverage for them). Pure + unit-tested.

const NAME_TO_CODE: Record<string, string> = {
	australia: "aus",
	austria: "aut",
	azerbaijan: "aze",
	belgium: "bel",
	brazil: "bra",
	bahrain: "brn",
	canada: "can",
	china: "chn",
	spain: "esp",
	france: "fra",
	uk: "gbr",
	"united kingdom": "gbr",
	"great britain": "gbr",
	britain: "gbr",
	england: "gbr",
	germany: "ger",
	hungary: "hun",
	italy: "ita",
	japan: "jpn",
	"saudi arabia": "ksa",
	"saudi-arabia": "ksa",
	mexico: "mex",
	monaco: "mon",
	netherlands: "ned",
	holland: "ned",
	portugal: "por",
	qatar: "qat",
	russia: "rus",
	singapore: "sgp",
	uae: "uae",
	"united arab emirates": "uae",
	"abu dhabi": "uae",
	usa: "usa",
	"united states": "usa",
	"united states of america": "usa",
	america: "usa",
};

/** Flag asset code for a country name, or null when unknown / no asset. */
export function flagCode(country: string | null | undefined): string | null {
	if (!country) return null;
	const key = country.trim().toLowerCase();
	return NAME_TO_CODE[key] ?? null;
}
