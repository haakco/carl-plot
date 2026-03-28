import { select } from "d3-selection";
import "d3-transition";
import { type ZoomBehavior, zoom, zoomIdentity } from "d3-zoom";
import {
	pixelToComplexPoint,
	viewportToZoomTransform,
	zoomTransformToViewport,
} from "@/lib/viewport";
import { explorerStore, setCenter, setCursorZ, setZoom } from "@/store/explorer-store";

export class PanZoomController {
	private canvas: HTMLCanvasElement | null = null;
	private zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> | null = null;
	private suppressZoomEvent = false;

	/** True when the zoom handler itself is updating the store (to prevent re-sync loops). */
	isZoomDriven = false;

	init(canvas: HTMLCanvasElement): void {
		this.canvas = canvas;

		this.zoomBehavior = zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([0.1, 100])
			.on("zoom", (event) => {
				if (this.suppressZoomEvent) return;

				const { x, y, k } = event.transform;
				const viewport = zoomTransformToViewport(x, y, k, canvas.clientWidth, canvas.clientHeight);

				this.isZoomDriven = true;
				setCenter(viewport.center.re, viewport.center.im);
				setZoom(viewport.zoom);
				this.isZoomDriven = false;
			});

		select(canvas).call(this.zoomBehavior).on("dblclick.zoom", null);

		// Sync d3-zoom transform to current store state
		this.syncTransformFromStore();

		canvas.addEventListener("mousemove", this.handleMouseMove);
		canvas.addEventListener("mouseleave", this.handleMouseLeave);
	}

	/**
	 * Sync the d3-zoom transform to match the current store center/zoom.
	 * Call this after externally changing center/zoom (e.g. loading a preset).
	 */
	syncTransformFromStore(): void {
		if (!this.canvas || !this.zoomBehavior) return;
		const { center, zoom: k } = explorerStore.state;
		const { x, y } = viewportToZoomTransform(
			center,
			k,
			this.canvas.clientWidth,
			this.canvas.clientHeight,
		);
		const transform = zoomIdentity.translate(x, y).scale(k);

		this.suppressZoomEvent = true;
		select(this.canvas).call(this.zoomBehavior.transform, transform);
		this.suppressZoomEvent = false;
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
		const { center, zoom } = explorerStore.state;
		const point = pixelToComplexPoint(pixelX, pixelY, rect.width, rect.height, center, zoom);

		setCursorZ(point);
	};

	private handleMouseLeave = (): void => {
		setCursorZ(null);
	};
}
