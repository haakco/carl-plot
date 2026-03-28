import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { complexToPixel } from "@/lib/coordinates";
import { getViewportBounds } from "@/lib/viewport";
import { evaluateRational } from "@/math/evaluate-rational";
import { explorerStore } from "@/store/explorer-store";

interface ConformalGridProps {
	width: number;
	height: number;
}

const GRID_LINES = 11;
const SAMPLES_PER_LINE = 60;

export function buildGridLines(
	poles: { re: number; im: number }[],
	zeros: { re: number; im: number }[],
	gain: number,
	bounds: { reMin: number; reMax: number; imMin: number; imMax: number },
): { horizontal: { re: number; im: number }[][]; vertical: { re: number; im: number }[][] } {
	const stepRe = (bounds.reMax - bounds.reMin) / (GRID_LINES - 1);
	const stepIm = (bounds.imMax - bounds.imMin) / (GRID_LINES - 1);
	const horizontal: { re: number; im: number }[][] = [];
	const vertical: { re: number; im: number }[][] = [];

	for (let i = 0; i < GRID_LINES; i++) {
		const imCoord = bounds.imMin + i * stepIm;
		const reCoord = bounds.reMin + i * stepRe;
		const hLine: { re: number; im: number }[] = [];
		const vLine: { re: number; im: number }[] = [];

		for (let j = 0; j < SAMPLES_PER_LINE; j++) {
			const tRe = bounds.reMin + (j / (SAMPLES_PER_LINE - 1)) * (bounds.reMax - bounds.reMin);
			const tIm = bounds.imMin + (j / (SAMPLES_PER_LINE - 1)) * (bounds.imMax - bounds.imMin);

			const hResult = evaluateRational({ re: tRe, im: imCoord }, poles, zeros, gain);
			if (Number.isFinite(hResult.re) && Number.isFinite(hResult.im)) {
				hLine.push(hResult);
			}

			const vResult = evaluateRational({ re: reCoord, im: tIm }, poles, zeros, gain);
			if (Number.isFinite(vResult.re) && Number.isFinite(vResult.im)) {
				vLine.push(vResult);
			}
		}

		horizontal.push(hLine);
		vertical.push(vLine);
	}

	return { horizontal, vertical };
}

function lineToPath(points: { re: number; im: number }[], width: number, height: number): string {
	if (points.length < 2) return "";

	const parts: string[] = [];
	let prevPx = complexToPixel(points[0], width, height);
	parts.push(`M${prevPx.x.toFixed(1)},${prevPx.y.toFixed(1)}`);

	for (let i = 1; i < points.length; i++) {
		const px = complexToPixel(points[i], width, height);
		// Break the line if the jump is too large (near a pole)
		const dx = px.x - prevPx.x;
		const dy = px.y - prevPx.y;
		if (dx * dx + dy * dy > 40000) {
			parts.push(`M${px.x.toFixed(1)},${px.y.toFixed(1)}`);
		} else {
			parts.push(`L${px.x.toFixed(1)},${px.y.toFixed(1)}`);
		}
		prevPx = px;
	}

	return parts.join("");
}

export function ConformalGrid({ width, height }: ConformalGridProps) {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);
	const show = useStore(explorerStore, (s) => s.showConformalGrid);
	const center = useStore(explorerStore, (s) => s.center);
	const zoom = useStore(explorerStore, (s) => s.zoom);
	const mode = useStore(explorerStore, (s) => s.mode);

	const gridLines = useMemo(() => {
		if (!show || mode !== "poles-zeros") return null;
		return buildGridLines(poles, zeros, gain, getViewportBounds(width, height, center, zoom));
	}, [show, mode, poles, zeros, gain, center, zoom, width, height]);

	if (!show || !gridLines) return null;

	return (
		<svg
			className="pointer-events-none absolute inset-0 z-[5]"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label="Conformal mapping grid showing how the transfer function deforms the complex plane"
		>
			{gridLines.horizontal.map((line, i) => {
				const d = lineToPath(line, width, height);
				if (!d) return null;
				return (
					<path
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed grid line count
						key={`h-${i}`}
						d={d}
						fill="none"
						stroke="oklch(0.6 0.08 200)"
						strokeWidth={0.8}
						opacity={0.5}
					/>
				);
			})}
			{gridLines.vertical.map((line, i) => {
				const d = lineToPath(line, width, height);
				if (!d) return null;
				return (
					<path
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed grid line count
						key={`v-${i}`}
						d={d}
						fill="none"
						stroke="oklch(0.6 0.08 145)"
						strokeWidth={0.8}
						opacity={0.5}
					/>
				);
			})}
		</svg>
	);
}
