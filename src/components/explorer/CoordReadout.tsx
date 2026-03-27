import { useStore } from "@tanstack/react-store";
import { explorerStore } from "@/store/explorer-store";

function formatCoord(value: number): string {
	return value >= 0 ? value.toFixed(2) : value.toFixed(2);
}

function formatComplex(re: number, im: number): string {
	const sign = im >= 0 ? "+" : "\u2212";
	return `z = ${formatCoord(re)} ${sign} ${formatCoord(Math.abs(im))}i`;
}

export function CoordReadout() {
	const cursorZ = useStore(explorerStore, (s) => s.cursorZ);

	if (!cursorZ) return null;

	return (
		<div className="absolute bottom-2 right-2 rounded-sm bg-[oklch(0.13_0.015_247_/_0.8)] px-2 py-1">
			<span className="font-mono text-[13px] text-foreground tabular-nums">
				{formatComplex(cursorZ.re, cursorZ.im)}
			</span>
		</div>
	);
}
