import type { Complex } from "./complex";

const EPSILON = 1e-6;

export interface ResidueResult {
	re: number;
	im: number;
	order: number;
}

/**
 * Check if two complex numbers are at the same location.
 */
function sameLocation(a: Complex, b: Complex): boolean {
	return Math.abs(a.re - b.re) < EPSILON && Math.abs(a.im - b.im) < EPSILON;
}

/**
 * Compute the residue of f(z) = K * prod(z - zeros) / prod(z - poles) at a given pole.
 *
 * For a simple pole p:
 *   Res(f, p) = K * prod(p - zeros[i]) / prod(p - otherPoles[j])
 *
 * For a pole of order n (multiple poles at the same location),
 * returns order > 1 without computing the residue.
 */
export function computeResidue(
	pole: Complex,
	allPoles: Complex[],
	zeros: Complex[],
	gain: number,
): ResidueResult {
	// Count the order of this pole
	const order = allPoles.filter((p) => sameLocation(p, pole)).length;

	if (order > 1) {
		return { re: 0, im: 0, order };
	}

	// Simple pole: Res = K * prod(p - z_i) / prod(p - p_j) for p_j != p
	let numRe = gain;
	let numIm = 0;

	// Multiply by (pole - zero_i) for each zero
	for (const z of zeros) {
		const dRe = pole.re - z.re;
		const dIm = pole.im - z.im;
		const newRe = numRe * dRe - numIm * dIm;
		const newIm = numRe * dIm + numIm * dRe;
		numRe = newRe;
		numIm = newIm;
	}

	// Divide by (pole - otherPole_j) for each other pole
	for (const p of allPoles) {
		if (sameLocation(p, pole)) continue;
		const dRe = pole.re - p.re;
		const dIm = pole.im - p.im;
		const denom = dRe * dRe + dIm * dIm;
		if (denom < EPSILON * EPSILON) {
			// Degenerate case
			return { re: Number.NaN, im: Number.NaN, order: 1 };
		}
		const newRe = (numRe * dRe + numIm * dIm) / denom;
		const newIm = (numIm * dRe - numRe * dIm) / denom;
		numRe = newRe;
		numIm = newIm;
	}

	return { re: numRe, im: numIm, order };
}

/**
 * Compute residues for all poles at once.
 * Deduplicates poles at the same location to avoid redundant computation.
 */
export function computeAllResidues(
	poles: Complex[],
	zeros: Complex[],
	gain: number,
): Map<string, ResidueResult> {
	const results = new Map<string, ResidueResult>();
	const computed = new Map<string, ResidueResult>();

	for (const pole of poles) {
		const key = `${pole.re.toFixed(6)},${pole.im.toFixed(6)}`;
		const cached = computed.get(key);
		if (cached) {
			results.set(pole.id, cached);
		} else {
			const result = computeResidue(pole, poles, zeros, gain);
			computed.set(key, result);
			results.set(pole.id, result);
		}
	}

	return results;
}

/**
 * Format a residue result as plain text (for SVG labels).
 */
export function formatResiduePlain(result: ResidueResult): string {
	if (result.order > 1) return `order ${result.order}`;

	const DISPLAY_EPSILON = 0.005;
	const re = Math.round(result.re * 100) / 100;
	const im = Math.round(result.im * 100) / 100;

	if (Math.abs(im) < DISPLAY_EPSILON) return re.toFixed(2);
	if (Math.abs(re) < DISPLAY_EPSILON) return `${im.toFixed(2)}i`;
	const sign = im >= 0 ? "+" : "−";
	return `${re.toFixed(2)} ${sign} ${Math.abs(im).toFixed(2)}i`;
}

/**
 * Format a residue result for display.
 */
export function formatResidue(result: ResidueResult): string {
	if (result.order > 1) {
		return `\\text{Order ${result.order} pole}`;
	}

	const DISPLAY_EPSILON = 0.005;
	const re = Math.round(result.re * 100) / 100;
	const im = Math.round(result.im * 100) / 100;

	if (Math.abs(im) < DISPLAY_EPSILON) {
		return `\\text{Res} = ${re.toFixed(2)}`;
	}
	if (Math.abs(re) < DISPLAY_EPSILON) {
		return `\\text{Res} = ${im.toFixed(2)}i`;
	}
	const sign = im >= 0 ? "+" : "-";
	return `\\text{Res} = ${re.toFixed(2)} ${sign} ${Math.abs(im).toFixed(2)}i`;
}
