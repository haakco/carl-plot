import { explorerStore } from "@/store/explorer-store";

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
	const minDim = Math.min(width, height);

	const re = (localX - width / 2) / (state.zoom * minDim) + state.center.re;
	const im = (height / 2 - localY) / (state.zoom * minDim) + state.center.im;
	return { re, im };
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
	const minDim = Math.min(width, height);

	const x = (z.re - state.center.re) * state.zoom * minDim + width / 2;
	const y = height / 2 - (z.im - state.center.im) * state.zoom * minDim;
	return { x, y };
}
