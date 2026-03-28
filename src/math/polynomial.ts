import type { Complex } from "./complex";

/** A complex coefficient { re, im }. */
export type ComplexCoeff = { re: number; im: number };

const EPSILON = 1e-9;

/**
 * Multiply two polynomials represented as coefficient arrays.
 * p(z) = a[0] + a[1]*z + a[2]*z^2 + ...
 */
export function multiplyPolynomials(a: ComplexCoeff[], b: ComplexCoeff[]): ComplexCoeff[] {
	if (a.length === 0 || b.length === 0) return [];
	const result: ComplexCoeff[] = Array.from({ length: a.length + b.length - 1 }, () => ({
		re: 0,
		im: 0,
	}));
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			// (a.re + a.im*i) * (b.re + b.im*i)
			result[i + j].re += a[i].re * b[j].re - a[i].im * b[j].im;
			result[i + j].im += a[i].re * b[j].im + a[i].im * b[j].re;
		}
	}
	return result;
}

/**
 * Build a polynomial from linear factors: (z - root1)(z - root2)...
 * Each factor (z - r) = [-r.re - r.im*i, 1] in coefficient form.
 * Returns [1] (constant 1) if roots is empty.
 */
function buildPolynomialFromRoots(roots: Complex[]): ComplexCoeff[] {
	let poly: ComplexCoeff[] = [{ re: 1, im: 0 }];
	for (const root of roots) {
		const factor: ComplexCoeff[] = [
			{ re: -root.re, im: -root.im },
			{ re: 1, im: 0 },
		];
		poly = multiplyPolynomials(poly, factor);
	}
	return poly;
}

/** Round a number, snapping near-zero values to 0. */
function cleanNumber(n: number): number {
	if (Math.abs(n) < EPSILON) return 0;
	return Math.round(n * 100) / 100;
}

/** Format a single complex coefficient for LaTeX. */
function formatCoeffLaTeX(c: ComplexCoeff): string {
	const re = cleanNumber(c.re);
	const im = cleanNumber(c.im);

	if (re === 0 && im === 0) return "0";
	if (im === 0) return formatReal(re);
	if (re === 0) return formatImag(im);
	const sign = im > 0 ? "+" : "-";
	return `(${formatReal(re)} ${sign} ${formatImag(Math.abs(im))})`;
}

function formatReal(n: number): string {
	return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function formatImag(absIm: number): string {
	if (absIm === 1) return "i";
	return `${Number.isInteger(absIm) ? absIm.toString() : absIm.toFixed(2)}i`;
}

/** Get the z variable part for a given degree: "", "z", or "z^{n}". */
function zPartForDegree(deg: number): string {
	if (deg === 0) return "";
	if (deg === 1) return "z";
	return `z^{${deg}}`;
}

/** Format a number as a string, using integer form when possible. */
function formatNumber(n: number): string {
	return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

/** Format a complex coefficient term (both re and im nonzero). */
function formatComplexTerm(c: ComplexCoeff, deg: number): string {
	const coeff = formatCoeffLaTeX(c);
	const zPart = zPartForDegree(deg);
	return deg === 0 ? coeff : `${coeff}${zPart}`;
}

/** Format a real-only or imaginary-only coefficient term. */
function formatScalarTerm(value: number, suffix: string, deg: number, isFirst: boolean): string {
	const absValue = Math.abs(value);
	const sign = isFirst ? (value < 0 ? "-" : "") : value >= 0 ? "+" : "-";

	let coeffPart: string;
	if (deg === 0 || absValue !== 1 || suffix) {
		coeffPart = `${formatNumber(absValue)}${suffix}`;
	} else {
		coeffPart = "";
	}

	const zPart = zPartForDegree(deg);
	return isFirst ? `${sign}${coeffPart}${zPart}` : `${sign} ${coeffPart}${zPart}`;
}

/** Format a single coefficient at a given degree into a LaTeX term. Returns null if zero. */
function formatTermAtDegree(c: ComplexCoeff, deg: number, isFirst: boolean): string | null {
	const re = cleanNumber(c.re);
	const im = cleanNumber(c.im);
	if (re === 0 && im === 0) return null;

	if (im !== 0 && re !== 0) {
		return formatComplexTerm(c, deg);
	}
	const value = im === 0 ? re : im;
	const suffix = im !== 0 ? "i" : "";
	return formatScalarTerm(value, suffix, deg, isFirst);
}

/** Format a polynomial as a LaTeX string, e.g. "z^2 - 1". */
function polynomialToLaTeX(coeffs: ComplexCoeff[]): string {
	if (coeffs.length === 0) return "0";

	const terms: string[] = [];
	for (let deg = coeffs.length - 1; deg >= 0; deg--) {
		const term = formatTermAtDegree(coeffs[deg], deg, terms.length === 0);
		if (term !== null) {
			terms.push(term);
		}
	}

	return terms.length === 0 ? "0" : terms.join(" ");
}

/**
 * Build LaTeX for the expanded polynomial form:
 * f(z) = K * (a_n z^n + ... + a_0) / (b_m z^m + ... + b_0)
 */
export function buildExpandedLaTeX(zeros: Complex[], poles: Complex[], gain: number): string {
	const numCoeffs = buildPolynomialFromRoots(zeros);
	const denCoeffs = buildPolynomialFromRoots(poles);

	const numLaTeX = polynomialToLaTeX(numCoeffs);
	const denLaTeX = polynomialToLaTeX(denCoeffs);

	const gainPrefix = gain === 1 ? "" : `${gain} \\cdot `;

	if (poles.length > 0) {
		return `f(z) = ${gainPrefix}\\frac{${numLaTeX}}{${denLaTeX}}`;
	}
	return `f(z) = ${gainPrefix}${numLaTeX}`;
}
