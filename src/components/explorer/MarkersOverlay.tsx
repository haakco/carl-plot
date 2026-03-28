import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { complexToPixel } from "@/lib/coordinates";
import { computeAllResidues, formatResiduePlain } from "@/math/residue";
import { explorerStore } from "@/store/explorer-store";
import { PoleZeroMarker } from "./PoleZeroMarker";

interface MarkersOverlayProps {
	width: number;
	height: number;
}

export function MarkersOverlay({ width, height }: MarkersOverlayProps) {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);
	const selectedId = useStore(explorerStore, (s) => s.selectedId);
	const showAllResidues = useStore(explorerStore, (s) => s.showAllResidues);
	const ghostTrail = useStore(explorerStore, (s) => s.ghostTrail);

	const allItems = [...poles, ...zeros];

	const multiplicityMap = useMemo(() => {
		const map = new Map<string, number>();
		const tolerance = 0.05;
		const all = [...poles, ...zeros];
		for (const item of all) {
			const sameType = item.type === "pole" ? poles : zeros;
			const count = sameType.filter(
				(other) =>
					Math.abs(other.re - item.re) < tolerance && Math.abs(other.im - item.im) < tolerance,
			).length;
			map.set(item.id, count);
		}
		return map;
	}, [poles, zeros]);

	const residueMap = useMemo(() => {
		if (!showAllResidues && !selectedId) return null;
		if (poles.length === 0) return null;
		return computeAllResidues(poles, zeros, gain);
	}, [showAllResidues, selectedId, poles, zeros, gain]);

	return (
		<svg
			className="pointer-events-none absolute inset-0 z-10"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label="Pole and zero markers on the complex plane"
		>
			{/* Ghost trail from drag */}
			{ghostTrail.length > 1 && (
				<>
					{/* Trail line */}
					<polyline
						points={ghostTrail
							.map((pt) => {
								const px = complexToPixel(pt, width, height);
								return `${px.x},${px.y}`;
							})
							.join(" ")}
						fill="none"
						stroke="oklch(0.6 0.12 250)"
						strokeWidth={1.5}
						opacity={0.3}
						strokeLinejoin="round"
					/>
					{/* Trail dots */}
					{ghostTrail.map((pt, i) => {
						const px = complexToPixel(pt, width, height);
						const opacity = 0.1 + 0.5 * (i / ghostTrail.length);
						return (
							<circle
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed trail array indexed by position
								key={`ghost-${i}`}
								cx={px.x}
								cy={px.y}
								r={3}
								fill="oklch(0.6 0.12 250)"
								opacity={opacity}
							/>
						);
					})}
				</>
			)}

			{allItems.map((item) => {
				const pixel = complexToPixel(item, width, height);
				return (
					<PoleZeroMarker
						key={item.id}
						type={item.type}
						isSelected={item.id === selectedId}
						pixelX={pixel.x}
						pixelY={pixel.y}
						itemId={item.id}
						canvasWidth={width}
						canvasHeight={height}
						re={item.re}
						im={item.im}
						multiplicity={multiplicityMap.get(item.id) ?? 1}
					/>
				);
			})}

			{/* Residue labels near poles */}
			{residueMap &&
				poles.map((pole) => {
					if (!showAllResidues && pole.id !== selectedId) return null;
					const result = residueMap.get(pole.id);
					if (!result) return null;
					const pixel = complexToPixel(pole, width, height);
					const mag = Math.sqrt(result.re * result.re + result.im * result.im);
					return (
						<text
							key={`res-${pole.id}`}
							x={pixel.x + 16}
							y={pixel.y - 12}
							fill="oklch(0.85 0.05 247)"
							fontSize={11}
							fontFamily="monospace"
							opacity={Math.min(1, 0.4 + mag * 0.1)}
						>
							Res={formatResiduePlain(result)}
						</text>
					);
				})}
		</svg>
	);
}
