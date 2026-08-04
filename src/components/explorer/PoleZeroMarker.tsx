import { useCallback, useRef } from "react";
import { pixelToComplex } from "@/lib/coordinates";
import { getStabilityColor, moveWithConjugate, snapToGrid } from "@/lib/singularity-helpers";
import { formatComplex } from "@/math/complex";
import {
	clearGhostTrail,
	explorerStore,
	pushGhostPoint,
	setSelectedId,
} from "@/store/explorer-store";

interface PoleZeroMarkerProps {
	type: "pole" | "zero";
	isSelected: boolean;
	pixelX: number;
	pixelY: number;
	itemId: string;
	canvasWidth: number;
	canvasHeight: number;
	re: number;
	im: number;
	multiplicity: number;
}

const POLE_COLOR = "oklch(0.65 0.18 25)";
const ZERO_COLOR = "oklch(0.65 0.15 195)";

export function PoleZeroMarker({
	type,
	isSelected,
	pixelX,
	pixelY,
	itemId,
	canvasWidth,
	canvasHeight,
	re,
	im,
	multiplicity,
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
			clearGhostTrail();
			pushGhostPoint(re, im);

			const svgRect = svg.getBoundingClientRect();

			const onPointerMove = (moveEvent: PointerEvent) => {
				if (!isDraggingRef.current) return;
				hasDraggedRef.current = true;
				const localX = moveEvent.clientX - svgRect.left;
				const localY = moveEvent.clientY - svgRect.top;
				const complex = pixelToComplex(localX, localY, canvasWidth, canvasHeight);
				// Record current position before moving for ghost trail
				const current = [...explorerStore.state.poles, ...explorerStore.state.zeros].find(
					(p) => p.id === itemId,
				);
				if (current) pushGhostPoint(current.re, current.im);
				moveWithConjugate(itemId, complex);
			};

			const onPointerUp = (upEvent: PointerEvent) => {
				isDraggingRef.current = false;
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", onPointerUp);

				if (hasDraggedRef.current) {
					setTimeout(clearGhostTrail, 600);
				}

				if (!hasDraggedRef.current) return;

				const localX = upEvent.clientX - svgRect.left;
				const localY = upEvent.clientY - svgRect.top;
				const complex = pixelToComplex(localX, localY, canvasWidth, canvasHeight);
				const snapped = {
					re: snapToGrid(complex.re),
					im: snapToGrid(complex.im),
				};
				moveWithConjugate(itemId, snapped);
			};

			window.addEventListener("pointermove", onPointerMove);
			window.addEventListener("pointerup", onPointerUp);
		},
		[itemId, canvasWidth, canvasHeight, re, im],
	);

	const label = `${type === "pole" ? "Pole" : "Zero"} at ${formatComplex({ id: itemId, type, re, im })}`;

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				setSelectedId(itemId);
			}
		},
		[itemId],
	);

	return (
		// biome-ignore lint/a11y/useSemanticElements: SVG <g> elements cannot be replaced with <button>
		<g
			ref={svgRef}
			transform={`translate(${pixelX}, ${pixelY})`}
			style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
			onPointerDown={handlePointerDown}
			onKeyDown={handleKeyDown}
			tabIndex={0}
			role="button"
			aria-label={label}
			className="focus-visible:outline-none"
		>
			{/* Hit target — large touch-friendly area */}
			<circle r={30} fill="transparent" />

			{/* Focus ring (visible on keyboard focus) */}
			<circle
				r={size + 6}
				fill="none"
				stroke={color}
				strokeWidth={2}
				opacity={0}
				className="marker-focus-ring"
			/>

			{/* Selection ring */}
			{isSelected && (
				<circle r={size + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
			)}

			{/* Stability glow ring for poles (Z-transform: unit circle stability) */}
			{type === "pole" &&
				(() => {
					const mag = Math.sqrt(re * re + im * im);
					const isMarginal = mag >= 0.95 && mag <= 1.05;
					return (
						<circle
							r={size + 10}
							fill="none"
							stroke={getStabilityColor(re, im)}
							strokeWidth={2}
							opacity={0.3}
							strokeDasharray="4 2"
						>
							{isMarginal && (
								<animate
									attributeName="opacity"
									values="0.2;0.6;0.2"
									dur="1.5s"
									repeatCount="indefinite"
								/>
							)}
						</circle>
					);
				})()}

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

			{/* Multiplicity shockwave + badge */}
			{multiplicity > 1 && (
				<>
					<circle r={size + 14} fill="none" stroke={color} strokeWidth={1.5} opacity={0}>
						<animate
							attributeName="r"
							values={`${size};${size + 20}`}
							dur="1.2s"
							repeatCount="indefinite"
						/>
						<animate attributeName="opacity" values="0.5;0" dur="1.2s" repeatCount="indefinite" />
					</circle>
					<circle
						cx={size + 4}
						cy={-(size + 4)}
						r={7}
						fill="oklch(0.2 0 0)"
						stroke={color}
						strokeWidth={1}
					/>
					<text
						x={size + 4}
						y={-(size + 1)}
						textAnchor="middle"
						fill={color}
						fontSize={9}
						fontWeight="bold"
					>
						×{multiplicity}
					</text>
				</>
			)}
		</g>
	);
}
