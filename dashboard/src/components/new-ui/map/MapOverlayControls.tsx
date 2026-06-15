export type MapOverlays = {
	labels: boolean;
	trails: boolean;
	marshalSectors: boolean;
	pitStatus: boolean;
};

const options: { key: keyof MapOverlays; label: string }[] = [
	{ key: "labels", label: "Labels" },
	{ key: "trails", label: "Trails" },
	{ key: "marshalSectors", label: "Marshal sectors" },
	{ key: "pitStatus", label: "Pit status" },
];

export default function MapOverlayControls({ value, onChange }: { value: MapOverlays; onChange: (value: MapOverlays) => void }) {
	return <fieldset className="flex flex-wrap gap-3"><legend className="sr-only">Map overlays</legend>{options.map((option) => <label key={option.key} className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm"><input type="checkbox" checked={value[option.key]} onChange={(event) => onChange({ ...value, [option.key]: event.target.checked })} />{option.label}</label>)}</fieldset>;
}
