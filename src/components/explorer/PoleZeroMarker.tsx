interface PoleZeroMarkerProps {
	type: "pole" | "zero";
	isSelected: boolean;
	pixelX: number;
	pixelY: number;
}

const POLE_COLOR = "oklch(0.65 0.18 25)";
const ZERO_COLOR = "oklch(0.65 0.15 195)";

export function PoleZeroMarker({ type, isSelected, pixelX, pixelY }: PoleZeroMarkerProps) {
	const color = type === "pole" ? POLE_COLOR : ZERO_COLOR;
	const size = isSelected ? 8 : 6;
	const strokeWidth = 2;

	return (
		<g
			transform={`translate(${pixelX}, ${pixelY})`}
			style={{ pointerEvents: "auto", cursor: "grab" }}
		>
			{/* Hit target — 44px minimum per Apple HIG */}
			<circle r={22} fill="transparent" />

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
