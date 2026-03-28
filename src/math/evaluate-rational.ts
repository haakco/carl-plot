import type { Complex } from "./complex";

export function evaluateRational(
	z: { re: number; im: number },
	poles: Complex[],
	zeros: Complex[],
	gain: number,
): { re: number; im: number } {
	// f(z) = gain * prod(z - zeros[i]) / prod(z - poles[i])
	let numRe = gain;
	let numIm = 0;
	for (const zero of zeros) {
		const dRe = z.re - zero.re;
		const dIm = z.im - zero.im;
		const newRe = numRe * dRe - numIm * dIm;
		const newIm = numRe * dIm + numIm * dRe;
		numRe = newRe;
		numIm = newIm;
	}
	let denRe = 1;
	let denIm = 0;
	for (const pole of poles) {
		const dRe = z.re - pole.re;
		const dIm = z.im - pole.im;
		const newRe = denRe * dRe - denIm * dIm;
		const newIm = denRe * dIm + denIm * dRe;
		denRe = newRe;
		denIm = newIm;
	}
	const d = denRe * denRe + denIm * denIm;
	if (d < 1e-20) return { re: Number.POSITIVE_INFINITY, im: Number.POSITIVE_INFINITY };
	return {
		re: (numRe * denRe + numIm * denIm) / d,
		im: (numIm * denRe - numRe * denIm) / d,
	};
}
