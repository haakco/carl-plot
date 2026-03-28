import { useCallback, useRef } from "react";
import { enforceConjugate } from "@/hooks/useConjugatePairs";
import { pixelToComplex } from "@/lib/coordinates";
import { explorerStore, moveSingularity, setSelectedId } from "@/store/explorer-store";

interface PoleZeroMarkerProps {
	type: "pole" | "zero";
	isSelected: boolean;
	pixelX: number;
	pixelY: number;
	itemId: string;
	canvasWidth: number;
	canvasHeight: number;
}

const POLE_COLOR = "oklch(0.65 0.18 25)";
const ZERO_COLOR = "oklch(0.65 0.15 195)";
const SNAP_GRID = 4;

function snapToGrid(value: number): number {
	return Math.round(value * SNAP_GRID) / SNAP_GRID;
}

export function PoleZeroMarker({
	type,
	isSelected,
	pixelX,
	pixelY,
	itemId,
	canvasWidth,
	canvasHeight,
}: PoleZeroMarkerProps) {
	const color = type === "pole" ? POLE_COLOR : ZERO_COLOR;
	const size = isSelected ? 8 : 6;
	const strokeWidth = 2;
	const isDraggingRef = useRef(false);
	const hasDraggedRef = useRef(false);
	const svgRef = useRef<SVGGElement>(null);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			const svg = svgRef.current?.ownerSVGElement;
			if (!svg) return;

			isDraggingRef.current = true;
			hasDraggedRef.current = false;
			setSelectedId(itemId);

			const svgRect = svg.getBoundingClientRect();

			const onPointerMove = (moveEvent: PointerEvent) => {
				if (!isDraggingRef.current) return;
				hasDraggedRef.current = true;
				const localX = moveEvent.clientX - svgRect.left;
				const localY = moveEvent.clientY - svgRect.top;
				const complex = pixelToComplex(localX, localY, canvasWidth, canvasHeight);

				if (explorerStore.state.enforceConjugates) {
					enforceConjugate(explorerStore, itemId, complex);
				} else {
					moveSingularity(itemId, complex.re, complex.im);
				}
			};

			const onPointerUp = (upEvent: PointerEvent) => {
				isDraggingRef.current = false;
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", onPointerUp);

				if (!hasDraggedRef.current) return;

				const localX = upEvent.clientX - svgRect.left;
				const localY = upEvent.clientY - svgRect.top;
				const complex = pixelToComplex(localX, localY, canvasWidth, canvasHeight);
				const snapped = {
					re: snapToGrid(complex.re),
					im: snapToGrid(complex.im),
				};

				if (explorerStore.state.enforceConjugates) {
					enforceConjugate(explorerStore, itemId, snapped);
				} else {
					moveSingularity(itemId, snapped.re, snapped.im);
				}
			};

			window.addEventListener("pointermove", onPointerMove);
			window.addEventListener("pointerup", onPointerUp);
		},
		[itemId, canvasWidth, canvasHeight],
	);

	return (
		<g
			ref={svgRef}
			transform={`translate(${pixelX}, ${pixelY})`}
			style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
			onPointerDown={handlePointerDown}
		>
			{/* Hit target — large touch-friendly area */}
			<circle r={30} fill="transparent" />

			{/* Selection ring */}
			{isSelected && (
				<circle r={size + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
			)}

			{type === "pole" ? (
				<>
					{/* Cross (x) marker */}
					<line
						x1={-size}
						y1={-size}
						x2={size}
						y2={size}
						stroke={color}
						strokeWidth={strokeWidth}
						strokeLinecap="round"
					/>
					<line
						x1={size}
						y1={-size}
						x2={-size}
						y2={size}
						stroke={color}
						strokeWidth={strokeWidth}
						strokeLinecap="round"
					/>
				</>
			) : (
				/* Circle (o) marker */
				<circle r={size} fill="none" stroke={color} strokeWidth={strokeWidth} />
			)}
		</g>
	);
}
