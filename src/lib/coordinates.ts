import { explorerStore } from "@/store/explorer-store";
import { complexToPixelPoint, pixelToComplexPoint } from "./viewport";

/**
 * Convert pixel coordinates (relative to canvas top-left) to complex plane coordinates.
 */
export function pixelToComplex(
	localX: number,
	localY: number,
	width: number,
	height: number,
): { re: number; im: number } {
	const state = explorerStore.state;
	return pixelToComplexPoint(localX, localY, width, height, state.center, state.zoom);
}

/**
 * Convert complex plane coordinates to pixel coordinates (relative to canvas top-left).
 */
export function complexToPixel(
	z: { re: number; im: number },
	width: number,
	height: number,
): { x: number; y: number } {
	const state = explorerStore.state;
	return complexToPixelPoint(z, width, height, state.center, state.zoom);
}
