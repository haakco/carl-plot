import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { PanelChrome } from "@/components/common/PanelChrome";
import { evaluateRational } from "@/math/evaluate-rational";
import { explorerStore } from "@/store/explorer-store";

const SPARK_W = 80;
const SPARK_H = 24;
const NUM_SAMPLES = 40;

export function timeDomainSamples(
	magnitude: number,
	phase: number,
	omega: number,
): { x: number; y: number }[] {
	const points: { x: number; y: number }[] = [];
	const clampedMag = Math.min(magnitude, 5);
	for (let i = 0; i < NUM_SAMPLES; i++) {
		const t = (i / (NUM_SAMPLES - 1)) * 4 * Math.PI;
		const y = clampedMag * Math.cos(omega * t + phase);
		points.push({ x: (i / (NUM_SAMPLES - 1)) * SPARK_W, y });
	}
	return points;
}

export function LaplaceLens() {
	const cursorZ = useStore(explorerStore, (s) => s.cursorZ);
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	const data = useMemo(() => {
		if (!cursorZ) return null;
		if (poles.length === 0 && zeros.length === 0) return null;

		const h = evaluateRational(cursorZ, poles, zeros, gain);
		if (!Number.isFinite(h.re) || !Number.isFinite(h.im)) return null;

		const magnitude = Math.sqrt(h.re * h.re + h.im * h.im);
		const phase = Math.atan2(h.im, h.re);
		const omega = Math.atan2(cursorZ.im, cursorZ.re);

		const samples = timeDomainSamples(magnitude, phase, omega);

		return { magnitude, phase, samples };
	}, [cursorZ, poles, zeros, gain]);

	if (!data) return null;

	// Build sparkline path
	const maxY = Math.max(1e-6, ...data.samples.map((s) => Math.abs(s.y)));
	const sparkPath = data.samples
		.map((pt, i) => {
			const sy = SPARK_H / 2 - (pt.y / maxY) * (SPARK_H / 2 - 2);
			return `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${sy.toFixed(1)}`;
		})
		.join("");

	return (
		<PanelChrome title="Laplace lens">
			<div className="flex gap-2">
				<div className="flex flex-col gap-0.5 text-[10px]">
					<span className="text-muted-foreground">
						|H| ={" "}
						<span className="font-mono tabular-nums text-foreground">
							{data.magnitude.toFixed(3)}
						</span>
					</span>
					<span className="text-muted-foreground">
						∠H ={" "}
						<span className="font-mono tabular-nums text-foreground">
							{((data.phase * 180) / Math.PI).toFixed(1)}°
						</span>
					</span>
				</div>
				<svg
					width={SPARK_W}
					height={SPARK_H}
					viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
					className="rounded border bg-[oklch(0.13_0.01_247)]"
					role="img"
					aria-label="Output waveform at cursor frequency"
				>
					{/* Zero line */}
					<line
						x1={0}
						y1={SPARK_H / 2}
						x2={SPARK_W}
						y2={SPARK_H / 2}
						stroke="oklch(0.25 0 0)"
						strokeWidth={0.5}
					/>
					<path d={sparkPath} fill="none" stroke="oklch(0.7 0.12 250)" strokeWidth={1} />
				</svg>
			</div>
		</PanelChrome>
	);
}
