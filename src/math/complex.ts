import { nanoid } from "nanoid";

export interface Complex {
	id: string;
	type: "pole" | "zero";
	re: number;
	im: number;
	pairId?: string;
}

export function createComplex(
	type: "pole" | "zero",
	re: number,
	im: number,
	pairId?: string,
): Complex {
	return { id: nanoid(), type, re, im, pairId };
}

/**
 * Format a complex number for display (e.g. "1.00 + 2.00i").
 * Handles real-only, imaginary-only, and general cases.
 */
export function formatComplex(z: Complex): string {
	const EPSILON = 0.001;
	const isRealZero = Math.abs(z.re) < EPSILON;
	const isImagZero = Math.abs(z.im) < EPSILON;

	if (isRealZero && isImagZero) return "0";
	if (isImagZero) return z.re.toFixed(2);
	if (isRealZero) return `${z.im.toFixed(2)}i`;

	const sign = z.im >= 0 ? "+" : "-";
	return `${z.re.toFixed(2)} ${sign} ${Math.abs(z.im).toFixed(2)}i`;
}

/**
 * Flatten an array of Complex into a Float32Array of [re, im, re, im, ...]
 * suitable for gl.uniform2fv.
 */
export function flattenComplexArray(arr: Complex[]): Float32Array {
	const result = new Float32Array(arr.length * 2);
	for (let i = 0; i < arr.length; i++) {
		result[i * 2] = arr[i].re;
		result[i * 2 + 1] = arr[i].im;
	}
	return result;
}

/** Euclidean distance between two complex numbers. */
export function complexDistance(a: Complex, b: Complex): number {
	const dRe = a.re - b.re;
	const dIm = a.im - b.im;
	return Math.sqrt(dRe * dRe + dIm * dIm);
}
