import { useStore } from "@tanstack/react-store";
import { evaluateRational } from "@/math/evaluate-rational";
import { explorerStore } from "@/store/explorer-store";

function formatCoord(value: number): string {
	return value >= 0 ? value.toFixed(2) : value.toFixed(2);
}

function formatComplexZ(re: number, im: number): string {
	const sign = im >= 0 ? "+" : "\u2212";
	return `z = ${formatCoord(re)} ${sign} ${formatCoord(Math.abs(im))}i`;
}

function formatComplexFz(re: number, im: number): string {
	const sign = im >= 0 ? "+" : "\u2212";
	return `f(z) = ${formatCoord(re)} ${sign} ${formatCoord(Math.abs(im))}i`;
}

export function CoordReadout() {
	const cursorZ = useStore(explorerStore, (s) => s.cursorZ);
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	if (!cursorZ) return null;

	const fz = evaluateRational(cursorZ, poles, zeros, gain);
	const modulus = Math.sqrt(fz.re * fz.re + fz.im * fz.im);
	const isInfinite = modulus > 1e6;
	const phase = (Math.atan2(fz.im, fz.re) * 180) / Math.PI;

	return (
		<div
			className="absolute bottom-2 right-2 rounded-sm bg-[oklch(0.13_0.015_247_/_0.8)] px-2 py-1"
			aria-label="Cursor position on complex plane"
			role="status"
		>
			<span className="font-mono text-[13px] text-foreground tabular-nums">
				{formatComplexZ(cursorZ.re, cursorZ.im)}
			</span>
			<div className="font-mono text-[13px] text-foreground tabular-nums">
				{isInfinite ? "f(z) = \u221E" : formatComplexFz(fz.re, fz.im)}
			</div>
			<div className="font-mono text-[13px] text-foreground tabular-nums">
				{isInfinite ? "|f(z)| = \u221E" : `|f(z)| = ${modulus.toFixed(2)}`}
			</div>
			<div className="font-mono text-[13px] text-foreground tabular-nums">
				{isInfinite ? "arg(f(z)) = \u221E" : `arg(f(z)) = ${phase.toFixed(2)}\u00B0`}
			</div>
		</div>
	);
}
