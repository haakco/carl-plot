import { useStore } from "@tanstack/react-store";
import { useEffect, useRef, useState } from "react";
import { useWebGLRenderer } from "@/hooks/useWebGLRenderer";
import { PanZoomController } from "@/renderer/PanZoomController";
import { explorerStore } from "@/store/explorer-store";
import { CauchyContour } from "./CauchyContour";
import { ConformalGrid } from "./ConformalGrid";
import { MarkersOverlay } from "./MarkersOverlay";

export function Canvas2D() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const panZoomRef = useRef<PanZoomController | null>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const isContextLost = useStore(explorerStore, (s) => s.webglContextLost);

	useWebGLRenderer(canvasRef);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const controller = new PanZoomController();
		controller.init(canvas);
		panZoomRef.current = controller;

		// Re-sync d3 transform when center/zoom change from outside the zoom handler
		// (preset load, URL decode, reset). Skip when the zoom handler itself is the source.
		const subscription = explorerStore.subscribe(() => {
			if (!controller.isZoomDriven) {
				controller.syncTransformFromStore();
			}
		});

		return () => {
			subscription.unsubscribe();
			controller.destroy();
			panZoomRef.current = null;
		};
	}, []);

	useEffect(() => {
		const container = canvasRef.current?.parentElement;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				setDimensions({ width, height });
			}
		});
		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	return (
		<div className="relative h-full w-full">
			<canvas
				ref={canvasRef}
				className="h-full w-full"
				role="img"
				aria-label="Domain coloring of the complex function on the complex plane"
			/>
			{isContextLost && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80">
					<div className="text-center">
						<p className="text-sm text-foreground">WebGL context was lost</p>
						<p className="text-xs text-muted-foreground">Attempting to restore...</p>
					</div>
				</div>
			)}
			{dimensions.width > 0 && (
				<>
					<ConformalGrid width={dimensions.width} height={dimensions.height} />
					<CauchyContour width={dimensions.width} height={dimensions.height} />
					<MarkersOverlay width={dimensions.width} height={dimensions.height} />
				</>
			)}
		</div>
	);
}
