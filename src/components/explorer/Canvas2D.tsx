import { useEffect, useRef, useState } from "react";
import { useWebGLRenderer } from "@/hooks/useWebGLRenderer";
import { PanZoomController } from "@/renderer/PanZoomController";
import { MarkersOverlay } from "./MarkersOverlay";

export function Canvas2D() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const panZoomRef = useRef<PanZoomController | null>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	useWebGLRenderer(canvasRef);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const controller = new PanZoomController();
		controller.init(canvas);
		panZoomRef.current = controller;

		return () => {
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
			<canvas ref={canvasRef} className="h-full w-full" />
			{dimensions.width > 0 && (
				<MarkersOverlay width={dimensions.width} height={dimensions.height} />
			)}
		</div>
	);
}
