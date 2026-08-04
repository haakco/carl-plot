export interface ViewportCenter {
	re: number;
	im: number;
}

export interface ViewportBounds {
	reMin: number;
	reMax: number;
	imMin: number;
	imMax: number;
}

export function getViewportBounds(
	canvasWidth: number,
	canvasHeight: number,
	center: ViewportCenter,
	zoom: number,
): ViewportBounds {
	const minDim = Math.min(canvasWidth, canvasHeight);
	const halfExtentX = canvasWidth / (2 * minDim * zoom);
	const halfExtentY = canvasHeight / (2 * minDim * zoom);
	return {
		reMin: center.re - halfExtentX,
		reMax: center.re + halfExtentX,
		imMin: center.im - halfExtentY,
		imMax: center.im + halfExtentY,
	};
}

export function pixelToComplexPoint(
	localX: number,
	localY: number,
	width: number,
	height: number,
	center: ViewportCenter,
	zoom: number,
): { re: number; im: number } {
	const minDim = Math.min(width, height);
	return {
		re: (localX - width / 2) / (zoom * minDim) + center.re,
		im: (height / 2 - localY) / (zoom * minDim) + center.im,
	};
}

export function complexToPixelPoint(
	z: { re: number; im: number },
	width: number,
	height: number,
	center: ViewportCenter,
	zoom: number,
): { x: number; y: number } {
	const minDim = Math.min(width, height);
	return {
		x: (z.re - center.re) * zoom * minDim + width / 2,
		y: height / 2 - (z.im - center.im) * zoom * minDim,
	};
}

export function zoomTransformToViewport(
	x: number,
	y: number,
	k: number,
	width: number,
	height: number,
): { center: ViewportCenter; zoom: number } {
	const minDim = Math.min(width, height);
	return {
		center: {
			re: -x / (k * minDim),
			im: y / (k * minDim),
		},
		zoom: k,
	};
}

export function viewportToZoomTransform(
	center: ViewportCenter,
	zoom: number,
	width: number,
	height: number,
): { x: number; y: number; k: number } {
	const minDim = Math.min(width, height);
	return {
		x: -center.re * zoom * minDim,
		y: center.im * zoom * minDim,
		k: zoom,
	};
}
