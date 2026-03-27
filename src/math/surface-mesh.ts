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
 * Generate a mesh representing |f(z)| as a height surface over the complex plane.
 * Uses domain coloring for vertex colors.
 */
export function generateSurfaceMesh(
	poles: Complex[],
	zeros: Complex[],
	gain: number,
	center: { re: number; im: number },
	zoom: number,
	resolution = 128,
	customEval?: EvalFn,
): MeshData {
	const extent = 3 / zoom;
	const step = (2 * extent) / resolution;

	const vertexCount = (resolution + 1) * (resolution + 1);
	const positions = new Float32Array(vertexCount * 3);
	const colors = new Float32Array(vertexCount * 3);

	for (let j = 0; j <= resolution; j++) {
		for (let i = 0; i <= resolution; i++) {
			const idx = j * (resolution + 1) + i;
			const re = center.re - extent + i * step;
			const im = center.im - extent + j * step;

			const { mag, arg } = customEval ? customEval(re, im) : evaluateF(re, im, poles, zeros, gain);
			const height = Math.min((2 / Math.PI) * Math.atan(mag), 1) * MAX_HEIGHT;

			positions[idx * 3] = re - center.re;
			positions[idx * 3 + 1] = height;
			positions[idx * 3 + 2] = -(im - center.im);

			const hue = arg / (2 * Math.PI) + 0.5;
			const [r, g, b] = hsv2rgb(((hue % 1) + 1) % 1, 0.85, 0.6 + 0.4 * (height / MAX_HEIGHT));
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
