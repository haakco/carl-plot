import { type Complex, formatComplex } from "./complex";

/**
 * Build a KaTeX-compatible LaTeX string for f(z) in factored form.
 *
 * With poles:   f(z) = K * numerator / denominator
 * Without poles: f(z) = K * numerator
 */
export function buildFactoredLaTeX(zeros: Complex[], poles: Complex[], gain: number): string {
	const numTerms = zeros.map((z) => `(z - ${formatComplex(z)})`).join("");
	const denTerms = poles.map((p) => `(z - ${formatComplex(p)})`).join("");

	const gainPrefix = gain === 1 ? "" : `${gain} \\cdot `;
	const numerator = numTerms || "1";
	const denominator = denTerms || "1";

	if (poles.length > 0) {
		return `f(z) = ${gainPrefix}\\frac{${numerator}}{${denominator}}`;
	}
	return `f(z) = ${gainPrefix}${numerator}`;
}
