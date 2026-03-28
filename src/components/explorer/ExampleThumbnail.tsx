import type { ExplorerExample } from "@/store/examples";

function PoleZeroPreview({ example }: { example: ExplorerExample }) {
	const preset = example.preset;
	if (!preset) return null;

	return (
		<svg
			className="h-16 w-full rounded border border-border/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]"
			viewBox="0 0 96 64"
			role="img"
			aria-label={example.thumbnailLabel}
		>
			<line x1="48" y1="8" x2="48" y2="56" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
			<line x1="8" y1="32" x2="88" y2="32" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
			{preset.zeros.map((zero) => (
				<circle
					key={zero.id}
					cx={48 + zero.re * 12}
					cy={32 - zero.im * 12}
					r="5"
					fill="none"
					stroke="oklch(0.7 0.15 195)"
					strokeWidth="2"
				/>
			))}
			{preset.poles.map((pole) => (
				<g key={pole.id} transform={`translate(${48 + pole.re * 12} ${32 - pole.im * 12})`}>
					<line x1="-5" y1="-5" x2="5" y2="5" stroke="oklch(0.7 0.18 25)" strokeWidth="2" />
					<line x1="5" y1="-5" x2="-5" y2="5" stroke="oklch(0.7 0.18 25)" strokeWidth="2" />
				</g>
			))}
		</svg>
	);
}

function ExpressionPreview({ example }: { example: ExplorerExample }) {
	const title = example.name.toLowerCase();
	const path = title.includes("joukowski")
		? "M8,40 C22,18 42,18 62,32 C72,38 82,38 88,28"
		: "M8,42 C18,28 28,20 38,30 C48,40 58,18 68,24 C78,30 84,22 88,18";

	return (
		<svg
			className="h-16 w-full rounded border border-border/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]"
			viewBox="0 0 96 64"
			role="img"
			aria-label={example.thumbnailLabel}
		>
			<defs>
				<linearGradient id={`grad-${example.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="oklch(0.76 0.12 210)" />
					<stop offset="100%" stopColor="oklch(0.72 0.14 70)" />
				</linearGradient>
			</defs>
			<path d={path} fill="none" stroke={`url(#grad-${example.name})`} strokeWidth="3" />
			<text
				x="10"
				y="54"
				fill="rgba(255,255,255,0.72)"
				fontSize="9"
				fontFamily="IBM Plex Mono, monospace"
			>
				{example.expression}
			</text>
		</svg>
	);
}

export function ExampleThumbnail({ example }: { example: ExplorerExample }) {
	return example.kind === "preset" ? (
		<PoleZeroPreview example={example} />
	) : (
		<ExpressionPreview example={example} />
	);
}
