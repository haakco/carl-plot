import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { PanelChrome, PanelSurface } from "@/components/common/PanelChrome";
import { computeImpulseResponse, isSystemStable } from "@/math/impulse-response";
import { explorerStore } from "@/store/explorer-store";

const WIDTH = 180;
const HEIGHT = 50;
const PADDING = 4;
const NUM_SAMPLES = 64;

export function ImpulseSparkline() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	const samples = useMemo(
		() => computeImpulseResponse(poles, zeros, gain, NUM_SAMPLES),
		[poles, zeros, gain],
	);

	const stable = useMemo(() => isSystemStable(poles), [poles]);

	if (poles.length === 0 && zeros.length === 0) return null;

	const hasNaN = samples.some((s) => Number.isNaN(s));

	if (hasNaN) {
		return (
			<PanelChrome title="h[n] impulse response">
				<PanelSurface className="flex items-center justify-center py-3">
					<span className="text-[10px] text-muted-foreground">
						Repeated poles — partial fraction unsupported
					</span>
				</PanelSurface>
			</PanelChrome>
		);
	}

	// Compute scale
	const maxAbs = Math.max(1e-6, ...samples.map((s) => Math.abs(s)));
	const plotW = WIDTH - 2 * PADDING;
	const plotH = HEIGHT - 2 * PADDING;
	const barW = plotW / NUM_SAMPLES;

	const color = stable ? "oklch(0.7 0.15 145)" : "oklch(0.7 0.15 25)";

	return (
		<PanelChrome
			title="h[n] impulse response"
			actions={
				<span className="text-[10px] font-medium" style={{ color }}>
					{stable ? "stable" : "unstable"}
				</span>
			}
		>
			<svg
				width={WIDTH}
				height={HEIGHT}
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="rounded border bg-[oklch(0.13_0.01_247)]"
				role="img"
				aria-label={`Impulse response: ${stable ? "stable (decaying)" : "unstable (growing)"}`}
			>
				{/* Zero line */}
				<line
					x1={PADDING}
					y1={HEIGHT / 2}
					x2={WIDTH - PADDING}
					y2={HEIGHT / 2}
					stroke="oklch(0.3 0 0)"
					strokeWidth={0.5}
				/>

				{/* Sample bars */}
				{samples.map((val, i) => {
					const normalized = val / maxAbs;
					const barHeight = Math.abs(normalized) * (plotH / 2);
					const y = val >= 0 ? HEIGHT / 2 - barHeight : HEIGHT / 2;
					return (
						<rect
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed-size sample array
							key={`sample-${i}`}
							x={PADDING + i * barW}
							y={y}
							width={Math.max(0.5, barW - 0.5)}
							height={Math.max(0.5, barHeight)}
							fill={color}
							opacity={0.7}
						/>
					);
				})}
			</svg>
		</PanelChrome>
	);
}
