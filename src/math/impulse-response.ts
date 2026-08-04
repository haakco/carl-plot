import type { Complex } from "./complex";
import { computeAllResidues } from "./residue";

/**
 * Compute the discrete-time impulse response h[n] for a rational Z-transform
 * H(z) = K * prod(z - zeros) / prod(z - poles).
 *
 * Uses partial fraction expansion for simple poles:
 *   h[n] = sum_k Res_k * p_k^n
 *
 * For higher-order poles, falls back to direct evaluation of the inverse Z-transform
 * is not implemented — returns NaN for those samples.
 *
 * @param poles System poles
 * @param zeros System zeros
 * @param gain System gain K
 * @param numSamples Number of impulse response samples to compute
 * @returns Array of h[n] values for n = 0, 1, ..., numSamples-1
 */
export function computeImpulseResponse(
	poles: Complex[],
	zeros: Complex[],
	gain: number,
	numSamples = 64,
): number[] {
	// No poles: FIR system. h[n] = coefficients of K * prod(z - z_i).
	if (poles.length === 0) {
		return computeFirResponse(zeros, gain, numSamples);
	}

	const residues = computeAllResidues(poles, zeros, gain);
	if ([...residues.values()].some((result) => result.order > 1)) {
		return new Array(numSamples).fill(Number.NaN);
	}

	const seen = new Set<string>();
	const h = new Array(numSamples).fill(0);

	for (const pole of poles) {
		// Deduplicate conjugate pairs — only process each unique pole location once
		const locKey = `${pole.re.toFixed(6)},${pole.im.toFixed(6)}`;
		if (seen.has(locKey)) continue;
		seen.add(locKey);

		const res = residues.get(pole.id);
		if (!res) continue;

		for (let n = 0; n < numSamples; n++) {
			// p^n = r^n * (cos(nθ) + i*sin(nθ))
			const r = Math.sqrt(pole.re * pole.re + pole.im * pole.im);
			const theta = Math.atan2(pole.im, pole.re);
			const rn = r ** n;
			const pnRe = rn * Math.cos(n * theta);
			const pnIm = rn * Math.sin(n * theta);

			// h[n] += Re(Res * p^n)
			h[n] += res.re * pnRe - res.im * pnIm;
		}
	}

	return h;
}

/**
 * Compute FIR impulse response for a zero-only system.
 * H(z) = K * prod(z - z_i) → h[n] = polynomial coefficients.
 */
function computeFirResponse(zeros: Complex[], gain: number, numSamples: number): number[] {
	// Start with [K] and convolve with (z - z_i) = [1, -z_i] for each zero
	let coeffsRe = [gain];
	let coeffsIm = [0];

	for (const zero of zeros) {
		const newLen = coeffsRe.length + 1;
		const newRe = new Array(newLen).fill(0);
		const newIm = new Array(newLen).fill(0);

		for (let i = 0; i < coeffsRe.length; i++) {
			// Multiply by 1 (shift)
			newRe[i] += coeffsRe[i];
			newIm[i] += coeffsIm[i];
			// Multiply by -z_i
			newRe[i + 1] -= coeffsRe[i] * zero.re - coeffsIm[i] * zero.im;
			newIm[i + 1] -= coeffsRe[i] * zero.im + coeffsIm[i] * zero.re;
		}

		coeffsRe = newRe;
		coeffsIm = newIm;
	}

	const h = new Array(numSamples).fill(0);
	for (let n = 0; n < Math.min(coeffsRe.length, numSamples); n++) {
		h[n] = coeffsRe[n];
	}
	return h;
}

/**
 * Determine if the system is stable (all poles inside unit circle).
 */
export function isSystemStable(poles: Complex[]): boolean {
	return poles.every((p) => Math.sqrt(p.re * p.re + p.im * p.im) < 1.0 - 1e-6);
}
