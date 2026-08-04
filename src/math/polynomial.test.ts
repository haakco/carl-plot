import { describe, expect, it } from "vitest";
import { createComplex } from "./complex";
import { buildExpandedLaTeX, multiplyPolynomials } from "./polynomial";

describe("multiplyPolynomials", () => {
	it("multiplies two linear polynomials (z-1)(z+1) = z^2 - 1", () => {
		// (z - 1) = [-1, 1]
		const a = [
			{ re: -1, im: 0 },
			{ re: 1, im: 0 },
		];
		// (z + 1) = [1, 1]
		const b = [
			{ re: 1, im: 0 },
			{ re: 1, im: 0 },
		];
		const result = multiplyPolynomials(a, b);
		// z^2 - 1 = [-1, 0, 1]
		expect(result).toHaveLength(3);
		expect(result[0].re).toBeCloseTo(-1);
		expect(result[0].im).toBeCloseTo(0);
		expect(result[1].re).toBeCloseTo(0);
		expect(result[1].im).toBeCloseTo(0);
		expect(result[2].re).toBeCloseTo(1);
		expect(result[2].im).toBeCloseTo(0);
	});

	it("multiplies (z - i)(z + i) = z^2 + 1", () => {
		// (z - i) = [0-i, 1]
		const a = [
			{ re: 0, im: -1 },
			{ re: 1, im: 0 },
		];
		// (z + i) = [0+i, 1]
		const b = [
			{ re: 0, im: 1 },
			{ re: 1, im: 0 },
		];
		const result = multiplyPolynomials(a, b);
		// z^2 + 1 = [1, 0, 1]
		expect(result).toHaveLength(3);
		expect(result[0].re).toBeCloseTo(1);
		expect(result[0].im).toBeCloseTo(0);
		expect(result[1].re).toBeCloseTo(0);
		expect(result[1].im).toBeCloseTo(0);
		expect(result[2].re).toBeCloseTo(1);
		expect(result[2].im).toBeCloseTo(0);
	});

	it("returns empty for empty input", () => {
		expect(multiplyPolynomials([], [{ re: 1, im: 0 }])).toEqual([]);
		expect(multiplyPolynomials([{ re: 1, im: 0 }], [])).toEqual([]);
	});

	it("multiplies a constant by a linear polynomial", () => {
		// 2 * (z - 3) = [-6, 2]
		const a = [{ re: 2, im: 0 }];
		const b = [
			{ re: -3, im: 0 },
			{ re: 1, im: 0 },
		];
		const result = multiplyPolynomials(a, b);
		expect(result).toHaveLength(2);
		expect(result[0].re).toBeCloseTo(-6);
		expect(result[1].re).toBeCloseTo(2);
	});
});

describe("buildExpandedLaTeX", () => {
	it("returns f(z) = 1 for no zeros or poles", () => {
		const result = buildExpandedLaTeX([], [], 1);
		expect(result).toBe("f(z) = 1");
	});

	it("expands a single zero at z=1: f(z) = z - 1", () => {
		const zeros = [createComplex("zero", 1, 0)];
		const result = buildExpandedLaTeX(zeros, [], 1);
		// Should contain z - 1
		expect(result).toContain("z");
		expect(result).toContain("1");
		expect(result).not.toContain("\\frac");
	});

	it("expands (z-1)(z+1) / (z-2) with gain 1", () => {
		const zeros = [createComplex("zero", 1, 0), createComplex("zero", -1, 0)];
		const poles = [createComplex("pole", 2, 0)];
		const result = buildExpandedLaTeX(zeros, poles, 1);
		// numerator: z^2 - 1, denominator: z - 2
		expect(result).toContain("\\frac");
		expect(result).toContain("z^{2}");
	});

	it("includes gain prefix when gain != 1", () => {
		const zeros = [createComplex("zero", 0, 0)];
		const result = buildExpandedLaTeX(zeros, [], 3);
		expect(result).toContain("3 \\cdot");
	});

	it("renders poles only as a fraction", () => {
		const poles = [createComplex("pole", 1, 0)];
		const result = buildExpandedLaTeX([], poles, 1);
		expect(result).toContain("\\frac");
	});
});
