import { useStore } from "@tanstack/react-store";
import type { Complex } from "@/math/complex";
import { explorerStore } from "@/store/explorer-store";
import { PoleZeroMarker } from "./PoleZeroMarker";

interface ViewportInfo {
	width: number;
	height: number;
}

function complexToPixel(
	z: Complex,
	center: { re: number; im: number },
	zoom: number,
	viewport: ViewportInfo,
): { x: number; y: number } {
	const minDim = Math.min(viewport.width, viewport.height);
	const x = (z.re - center.re) * zoom * minDim + viewport.width / 2;
	const y = viewport.height / 2 - (z.im - center.im) * zoom * minDim;
	return { x, y };
}

interface MarkersOverlayProps {
	width: number;
	height: number;
}

export function MarkersOverlay({ width, height }: MarkersOverlayProps) {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const center = useStore(explorerStore, (s) => s.center);
	const zoom = useStore(explorerStore, (s) => s.zoom);
	const selectedId = useStore(explorerStore, (s) => s.selectedId);

	const viewport: ViewportInfo = { width, height };
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
				const pixel = complexToPixel(item, center, zoom, viewport);
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
					/>
				);
			})}
		</svg>
	);
}
