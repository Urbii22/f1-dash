import Link from "next/link";

export default function Footer() {
	return (
		<footer className="my-6 border-t border-cyan-300/10 pt-4 font-mono text-xs text-zinc-500">
			<div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 uppercase">
				<p>F1 telemetry interface</p>
				<p>Version: {process.env.version}</p>
				<TextLink website="https://github.com/slowlydev/f1-dash">Source project</TextLink>
				<Link className="text-cyan-300/70 transition hover:text-cyan-100" href="/help">
					Help
				</Link>
			</div>

			<p className="max-w-5xl leading-relaxed text-zinc-600">
				This project/website is unofficial and is not associated in any way with the Formula 1 companies. F1, FORMULA
				ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trademarks of Formula One
				Licensing B.V.
			</p>
		</footer>
	);
}

type TextLinkProps = {
	website: string;
	children: string;
};

const TextLink = ({ website, children }: TextLinkProps) => {
	return (
		<a className="text-cyan-300/70 transition hover:text-cyan-100" target="_blank" href={website}>
			{children}
		</a>
	);
};
