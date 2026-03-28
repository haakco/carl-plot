import { useStore } from "@tanstack/react-store";
import { complexToPixel } from "@/lib/coordinates";
import { explorerStore } from "@/store/explorer-store";
import { PoleZeroMarker } from "./PoleZeroMarker";

interface MarkersOverlayProps {
	width: number;
	height: number;
}

export function MarkersOverlay({ width, height }: MarkersOverlayProps) {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const selectedId = useStore(explorerStore, (s) => s.selectedId);

	const allItems = [...poles, ...zeros];

	return (
		<svg
			className="pointer-events-none absolute inset-0 z-10"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label="Pole and zero markers on the complex plane"
		>
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
					/>
				);
			})}
		</svg>
	);
}
