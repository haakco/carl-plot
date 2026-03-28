import { useCallback, useEffect, useRef, useState } from "react";
import { setGainTransient } from "@/store/explorer-store";

const DEFAULT_MIN = 0.1;
const DEFAULT_MAX = 10;
const SWEEP_DURATION_MS = 3000;
const FRAME_INTERVAL = 1000 / 30;

export function GainSweep() {
	const [playing, setPlaying] = useState(false);
	const [sweepMin, setSweepMin] = useState(DEFAULT_MIN);
	const [sweepMax, setSweepMax] = useState(DEFAULT_MAX);
	const progressRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const lastTimeRef = useRef(0);

	const tick = useCallback(() => {
		const now = performance.now();
		const dt = now - lastTimeRef.current;
		if (dt >= FRAME_INTERVAL) {
			lastTimeRef.current = now;
			progressRef.current += dt / SWEEP_DURATION_MS;
			if (progressRef.current >= 1) progressRef.current = 0;

			// Ping-pong: sweep forward then backward
			const t = progressRef.current < 0.5 ? progressRef.current * 2 : 2 - progressRef.current * 2;
			const value = sweepMin + t * (sweepMax - sweepMin);
			setGainTransient(value);
		}
		rafRef.current = requestAnimationFrame(tick);
	}, [sweepMin, sweepMax]);

	useEffect(() => {
		if (playing) {
			lastTimeRef.current = performance.now();
			rafRef.current = requestAnimationFrame(tick);
		}
		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [playing, tick]);

	const togglePlay = () => setPlaying((prev) => !prev);

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={togglePlay}
					className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
					aria-label={playing ? "Pause gain sweep" : "Play gain sweep"}
				>
					{playing ? "⏸" : "▶"}
				</button>
				<span className="text-[10px] text-muted-foreground">
					Sweep {sweepMin.toFixed(1)} → {sweepMax.toFixed(1)}
				</span>
			</div>
			<div className="flex items-center gap-1">
				<input
					type="number"
					min={0.01}
					max={sweepMax - 0.01}
					step={0.1}
					value={sweepMin}
					onChange={(e) => setSweepMin(Number.parseFloat(e.target.value) || DEFAULT_MIN)}
					className="w-12 rounded border bg-transparent px-1 py-0.5 text-[10px] tabular-nums text-foreground"
					aria-label="Sweep minimum gain"
				/>
				<span className="text-[10px] text-muted-foreground">to</span>
				<input
					type="number"
					min={sweepMin + 0.01}
					max={100}
					step={0.1}
					value={sweepMax}
					onChange={(e) => setSweepMax(Number.parseFloat(e.target.value) || DEFAULT_MAX)}
					className="w-12 rounded border bg-transparent px-1 py-0.5 text-[10px] tabular-nums text-foreground"
					aria-label="Sweep maximum gain"
				/>
			</div>
		</div>
	);
}
