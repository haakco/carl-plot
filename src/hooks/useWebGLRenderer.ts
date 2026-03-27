import { type RefObject, useEffect, useRef } from "react";
import { DomainColoringRenderer } from "@/renderer/DomainColoringRenderer";

export function useWebGLRenderer(
	canvasRef: RefObject<HTMLCanvasElement | null>,
): RefObject<DomainColoringRenderer | null> {
	const rendererRef = useRef<DomainColoringRenderer | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const renderer = new DomainColoringRenderer(canvas);
		renderer.init();
		renderer.startLoop();
		rendererRef.current = renderer;

		const parent = canvas.parentElement;
		if (!parent) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				renderer.resize(width, height);
			}
		});
		resizeObserver.observe(parent);

		return () => {
			resizeObserver.disconnect();
			renderer.destroy();
			rendererRef.current = null;
		};
	}, [canvasRef]);

	return rendererRef;
}
