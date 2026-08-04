import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { PanelChrome } from "@/components/common/PanelChrome";
import { evaluateRational } from "@/math/evaluate-rational";
import { explorerStore } from "@/store/explorer-store";

const WIDTH = 180;
const HEIGHT = 140;
const PADDING = 12;
const NUM_POINTS = 256;

interface NyquistData {
	points: { re: number; im: number }[];
	gainMarginDb: number | null;
	phaseMarginDeg: number | null;
	crossingRe: number | null;
	crossingIm: number | null;
}

export function computeFreqResponse(
	poles: { re: number; im: number }[],
	zeros: { re: number; im: number }[],
	gain: number,
): { re: number; im: number }[] {
	const points: { re: number; im: number }[] = [];
	for (let i = 0; i <= NUM_POINTS; i++) {
		const omega = (i / NUM_POINTS) * Math.PI;
		const z = { re: Math.cos(omega), im: Math.sin(omega) };
		const h = evaluateRational(z, poles, zeros, gain);
		if (Number.isFinite(h.re) && Number.isFinite(h.im)) {
			points.push(h);
		}
	}
	return points;
}

export function findMargins(points: { re: number; im: number }[]): Omit<NyquistData, "points"> {
	let gainMarginDb: number | null = null;
	let phaseMarginDeg: number | null = null;
	let crossingRe: number | null = null;
	let crossingIm: number | null = null;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];

		// Phase crossing: Im changes sign near negative real axis
		if (prev.im * curr.im < 0 && curr.re < 0) {
			const t = Math.abs(prev.im) / (Math.abs(prev.im) + Math.abs(curr.im));
			const crossRe = prev.re + t * (curr.re - prev.re);
			const gm = Math.abs(crossRe);
			if (gm > 0) {
				gainMarginDb = -20 * Math.log10(gm);
				crossingRe = crossRe;
				crossingIm = 0;
			}
		}

		// Magnitude crossing: |H| crosses 1
		const magPrev = Math.sqrt(prev.re * prev.re + prev.im * prev.im);
		const magCurr = Math.sqrt(curr.re * curr.re + curr.im * curr.im);
		if ((magPrev - 1) * (magCurr - 1) < 0) {
			const t = Math.abs(magPrev - 1) / (Math.abs(magPrev - 1) + Math.abs(magCurr - 1));
			const phase = Math.atan2(
				prev.im + t * (curr.im - prev.im),
				prev.re + t * (curr.re - prev.re),
			);
			const margin = 180 + (phase * 180) / Math.PI;
			if (phaseMarginDeg === null || margin < phaseMarginDeg) {
				phaseMarginDeg = margin;
			}
		}
	}

	return { gainMarginDb, phaseMarginDeg, crossingRe, crossingIm };
}

export function computeNyquist(
	poles: { re: number; im: number }[],
	zeros: { re: number; im: number }[],
	gain: number,
): NyquistData {
	const points = computeFreqResponse(poles, zeros, gain);
	const margins = findMargins(points);
	return { points, ...margins };
}

const MARGIN_COLOR = "oklch(0.7 0.12 200)";

function mapToPixel(
	re: number,
	im: number,
	scale: number,
	offsetX: number,
	offsetY: number,
): { x: number; y: number } {
	return {
		x: offsetX + re * scale,
		y: offsetY - im * scale,
	};
}

export function NyquistPlot() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	const data = useMemo(() => {
		if (poles.length === 0 && zeros.length === 0) return null;
		return computeNyquist(poles, zeros, gain);
	}, [poles, zeros, gain]);

	if (!data || data.points.length < 2) return null;

	// Auto-scale to fit
	let maxExtent = 1;
	for (const pt of data.points) {
		maxExtent = Math.max(maxExtent, Math.abs(pt.re), Math.abs(pt.im));
	}
	// Clamp to avoid extreme scaling
	maxExtent = Math.min(maxExtent, 10);

	const plotW = WIDTH - 2 * PADDING;
	const plotH = HEIGHT - 2 * PADDING;
	const scale = Math.min(plotW, plotH) / (2 * maxExtent);
	const cx = PADDING + plotW / 2;
	const cy = PADDING + plotH / 2;

	// Build path
	const pathParts = data.points
		.map((pt, i) => {
			const { x, y } = mapToPixel(pt.re, pt.im, scale, cx, cy);
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join("");

	// Unit circle
	const unitR = scale;

	return (
		<PanelChrome title="Nyquist plot">
			<svg
				width={WIDTH}
				height={HEIGHT}
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="rounded border bg-[oklch(0.13_0.01_247)]"
				role="img"
				aria-label="Nyquist plot showing frequency response"
			>
				{/* Axes */}
				<line
					x1={PADDING}
					y1={cy}
					x2={WIDTH - PADDING}
					y2={cy}
					stroke="oklch(0.25 0 0)"
					strokeWidth={0.5}
				/>
				<line
					x1={cx}
					y1={PADDING}
					x2={cx}
					y2={HEIGHT - PADDING}
					stroke="oklch(0.25 0 0)"
					strokeWidth={0.5}
				/>

				{/* Unit circle */}
				<circle
					cx={cx}
					cy={cy}
					r={unitR}
					fill="none"
					stroke="oklch(0.3 0.05 145)"
					strokeWidth={0.5}
					strokeDasharray="3 2"
				/>

				{/* Critical point (-1, 0) */}
				<circle
					cx={cx - scale}
					cy={cy}
					r={3}
					fill="none"
					stroke="oklch(0.7 0.15 25)"
					strokeWidth={1}
				/>

				{/* Nyquist curve */}
				<path d={pathParts} fill="none" stroke="oklch(0.7 0.12 250)" strokeWidth={1.5} />

				{/* Gain margin crossing */}
				{data.crossingRe !== null && data.crossingIm !== null && (
					<circle
						cx={mapToPixel(data.crossingRe, data.crossingIm, scale, cx, cy).x}
						cy={mapToPixel(data.crossingRe, data.crossingIm, scale, cx, cy).y}
						r={3}
						fill={MARGIN_COLOR}
					/>
				)}
			</svg>

			{/* Margins */}
			<div className="flex gap-2 text-[9px] text-muted-foreground">
				{data.gainMarginDb !== null && (
					<span>
						GM: <span className="text-foreground">{data.gainMarginDb.toFixed(1)} dB</span>
					</span>
				)}
				{data.phaseMarginDeg !== null && (
					<span>
						PM: <span className="text-foreground">{data.phaseMarginDeg.toFixed(1)}°</span>
					</span>
				)}
			</div>
		</PanelChrome>
	);
}
