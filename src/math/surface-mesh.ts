import type { Complex } from "./complex";

const MAX_HEIGHT = 5;

export interface MeshData {
	positions: Float32Array;
	colors: Float32Array;
	indices: Uint32Array;
}

type EvalFn = (re: number, im: number) => { mag: number; arg: number };

function evaluateF(
	re: number,
	im: number,
	poles: Complex[],
	zeros: Complex[],
	gain: number,
): { mag: number; arg: number } {
	let wRe = gain;
	let wIm = 0;

	for (const z of zeros) {
		const dRe = re - z.re;
		const dIm = im - z.im;
		const newRe = wRe * dRe - wIm * dIm;
		const newIm = wRe * dIm + wIm * dRe;
		wRe = newRe;
		wIm = newIm;
	}

	for (const p of poles) {
		const dRe = re - p.re;
		const dIm = im - p.im;
		const denom = dRe * dRe + dIm * dIm;
		if (denom < 1e-10) {
			return { mag: MAX_HEIGHT, arg: Math.atan2(wIm, wRe) };
		}
		const newRe = (wRe * dRe + wIm * dIm) / denom;
		const newIm = (wIm * dRe - wRe * dIm) / denom;
		wRe = newRe;
		wIm = newIm;
	}

	return {
		mag: Math.sqrt(wRe * wRe + wIm * wIm),
		arg: Math.atan2(wIm, wRe),
	};
}

function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	switch (i % 6) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
		default:
			return [v, v, v];
	}
}

/**
 * Compute the visible complex-plane bounds matching the 2D renderer's coordinate mapping:
 *   z = (pixel - 0.5*resolution) / min(resolution.x, resolution.y) / zoom + center
 */
export function getViewportBounds(
	canvasWidth: number,
	canvasHeight: number,
	center: { re: number; im: number },
	zoom: number,
): { reMin: number; reMax: number; imMin: number; imMax: number } {
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

/**
 * Generate a mesh representing |f(z)| as a height surface over the complex plane.
 * Uses the same domain coloring as the 2D view for vertex colors:
 *   hue  = arg(f(z)) / (2*pi) + 0.5
 *   lightness = (2/pi) * atan(|f(z)|)
 *   saturation = 0.85
 */
export function generateSurfaceMesh(
	poles: Complex[],
	zeros: Complex[],
	gain: number,
	center: { re: number; im: number },
	zoom: number,
	resolution = 128,
	customEval?: EvalFn,
	canvasWidth = 800,
	canvasHeight = 600,
): MeshData {
	const bounds = getViewportBounds(canvasWidth, canvasHeight, center, zoom);
	const stepRe = (bounds.reMax - bounds.reMin) / resolution;
	const stepIm = (bounds.imMax - bounds.imMin) / resolution;

	const vertexCount = (resolution + 1) * (resolution + 1);
	const positions = new Float32Array(vertexCount * 3);
	const colors = new Float32Array(vertexCount * 3);

	for (let j = 0; j <= resolution; j++) {
		for (let i = 0; i <= resolution; i++) {
			const idx = j * (resolution + 1) + i;
			const re = bounds.reMin + i * stepRe;
			const im = bounds.imMin + j * stepIm;

			const { mag, arg } = customEval ? customEval(re, im) : evaluateF(re, im, poles, zeros, gain);
			const height = Math.min((2 / Math.PI) * Math.atan(mag), 1) * MAX_HEIGHT;

			positions[idx * 3] = re - center.re;
			positions[idx * 3 + 1] = height;
			positions[idx * 3 + 2] = -(im - center.im);

			// Match 2D domain coloring: hue from arg, lightness from atan(mag), saturation 0.85
			const hue = arg / (2 * Math.PI) + 0.5;
			const lightness = (2 / Math.PI) * Math.atan(mag);
			const [r, g, b] = hsv2rgb(((hue % 1) + 1) % 1, 0.85, lightness);
			colors[idx * 3] = r;
			colors[idx * 3 + 1] = g;
			colors[idx * 3 + 2] = b;
		}
	}

	const faceCount = resolution * resolution * 2;
	const indices = new Uint32Array(faceCount * 3);
	let triIdx = 0;

	for (let j = 0; j < resolution; j++) {
		for (let i = 0; i < resolution; i++) {
			const a = j * (resolution + 1) + i;
			const b = a + 1;
			const c = a + (resolution + 1);
			const d = c + 1;

			indices[triIdx++] = a;
			indices[triIdx++] = c;
			indices[triIdx++] = b;

			indices[triIdx++] = b;
			indices[triIdx++] = c;
			indices[triIdx++] = d;
		}
	}

	return { positions, colors, indices };
}
