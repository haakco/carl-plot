import { beforeEach, describe, expect, it } from "vitest";
import { explorerStore, reset, setCenter, setZoom } from "@/store/explorer-store";
import { PanZoomController } from "./PanZoomController";

function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");

	Object.defineProperty(canvas, "clientWidth", { configurable: true, value: width });
	Object.defineProperty(canvas, "clientHeight", { configurable: true, value: height });
	canvas.getBoundingClientRect = () =>
		({
			left: 10,
			top: 20,
			width,
			height,
			right: 10 + width,
			bottom: 20 + height,
			x: 10,
			y: 20,
			toJSON: () => ({}),
		}) as DOMRect;

	return canvas;
}

beforeEach(() => {
	reset();
});

describe("PanZoomController", () => {
	it("initializes d3 zoom from the current store viewport", () => {
		setCenter(1.5, 0.5);
		setZoom(2);
		const canvas = createCanvas(600, 400);
		const controller = new PanZoomController();

		controller.init(canvas);

		const transform = (
			canvas as HTMLCanvasElement & {
				__zoom?: { x: number; y: number; k: number };
			}
		).__zoom;

		expect(transform?.k).toBeCloseTo(2);
		expect(transform?.x).toBeCloseTo(-1200);
		expect(transform?.y).toBeCloseTo(400);

		controller.destroy();
	});

	it("maps cursor coordinates using the current center and zoom", () => {
		setCenter(1, -0.5);
		setZoom(2);
		const canvas = createCanvas(600, 400);
		const controller = new PanZoomController();

		controller.init(canvas);
		canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 410, clientY: 120 }));

		expect(explorerStore.state.cursorZ).toEqual({
			re: 1.125,
			im: -0.375,
		});

		controller.destroy();
	});
});
