import { select } from "d3-selection";
import "d3-transition";
import { type ZoomBehavior, zoom, zoomIdentity } from "d3-zoom";
import { setCenter, setCursorZ, setZoom } from "@/store/explorer-store";

export class PanZoomController {
	private canvas: HTMLCanvasElement | null = null;
	private zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> | null = null;

	init(canvas: HTMLCanvasElement): void {
		this.canvas = canvas;

		this.zoomBehavior = zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([0.1, 100])
			.on("zoom", (event) => {
				const { x, y, k } = event.transform;
				const minDim = Math.min(canvas.clientWidth, canvas.clientHeight);

				const centerRe = -x / (k * minDim);
				const centerIm = y / (k * minDim);

				setCenter(centerRe, centerIm);
				setZoom(k);
			});

		select(canvas).call(this.zoomBehavior).on("dblclick.zoom", null);

		canvas.addEventListener("mousemove", this.handleMouseMove);
		canvas.addEventListener("mouseleave", this.handleMouseLeave);
	}

	destroy(): void {
		if (this.canvas) {
			select(this.canvas).on(".zoom", null);
			this.canvas.removeEventListener("mousemove", this.handleMouseMove);
			this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
		}

		this.canvas = null;
		this.zoomBehavior = null;
	}

	resetTransform(): void {
		if (!this.canvas || !this.zoomBehavior) return;
		select(this.canvas).transition().duration(300).call(this.zoomBehavior.transform, zoomIdentity);
	}

	private handleMouseMove = (event: MouseEvent): void => {
		const canvas = this.canvas;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const pixelX = event.clientX - rect.left;
		const pixelY = event.clientY - rect.top;
		const minDim = Math.min(rect.width, rect.height);

		const re = (pixelX - rect.width / 2) / minDim;
		const im = -(pixelY - rect.height / 2) / minDim;

		setCursorZ({ re, im });
	};

	private handleMouseLeave = (): void => {
		setCursorZ(null);
	};
}
