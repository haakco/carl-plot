import { describe, expect, it } from "vitest";
import { createComplex } from "./complex";
import { computeResidue, formatResidue } from "./residue";

describe("computeResidue", () => {
	it("computes residue of 1/(z-1) at z=1 as 1", () => {
		const pole = createComplex("pole", 1, 0);
		const result = computeResidue(pole, [pole], [], 1);
		expect(result.order).toBe(1);
		expect(result.re).toBeCloseTo(1);
		expect(result.im).toBeCloseTo(0);
	});

	it("computes residue of z/(z-1) at z=1 as 1", () => {
		const pole = createComplex("pole", 1, 0);
		const zero = createComplex("zero", 0, 0);
		const result = computeResidue(pole, [pole], [zero], 1);
		expect(result.order).toBe(1);
		// Res = K * (1 - 0) / 1 = 1
		expect(result.re).toBeCloseTo(1);
		expect(result.im).toBeCloseTo(0);
	});

	it("computes residue of 1/((z-1)(z-2)) at z=1 as -1", () => {
		const p1 = createComplex("pole", 1, 0);
		const p2 = createComplex("pole", 2, 0);
		const result = computeResidue(p1, [p1, p2], [], 1);
		expect(result.order).toBe(1);
		// Res at z=1: 1 / (1-2) = -1
		expect(result.re).toBeCloseTo(-1);
		expect(result.im).toBeCloseTo(0);
	});

	it("computes residue of 1/((z-1)(z-2)) at z=2 as 1", () => {
		const p1 = createComplex("pole", 1, 0);
		const p2 = createComplex("pole", 2, 0);
		const result = computeResidue(p2, [p1, p2], [], 1);
		expect(result.order).toBe(1);
		// Res at z=2: 1 / (2-1) = 1
		expect(result.re).toBeCloseTo(1);
		expect(result.im).toBeCloseTo(0);
	});

	it("detects order 2 pole when two poles share a location", () => {
		const p1 = createComplex("pole", 1, 0);
		const p2 = createComplex("pole", 1, 0);
		const result = computeResidue(p1, [p1, p2], [], 1);
		expect(result.order).toBe(2);
	});

	it("applies gain factor", () => {
		const pole = createComplex("pole", 0, 0);
		const result = computeResidue(pole, [pole], [], 5);
		expect(result.order).toBe(1);
		expect(result.re).toBeCloseTo(5);
		expect(result.im).toBeCloseTo(0);
	});

	it("computes complex residue for pole at i with zero at origin", () => {
		const pole = createComplex("pole", 0, 1);
		const zero = createComplex("zero", 0, 0);
		// f(z) = z / (z - i), Res at z=i: i / 1 = i
		const result = computeResidue(pole, [pole], [zero], 1);
		expect(result.order).toBe(1);
		expect(result.re).toBeCloseTo(0);
		expect(result.im).toBeCloseTo(1);
	});
});

describe("formatResidue", () => {
	it("formats a real residue", () => {
		const result = formatResidue({ re: 1.5, im: 0, order: 1 });
		expect(result).toBe("\\text{Res} = 1.50");
	});

	it("formats a purely imaginary residue", () => {
		const result = formatResidue({ re: 0, im: 2, order: 1 });
		expect(result).toBe("\\text{Res} = 2.00i");
	});

	it("formats a complex residue", () => {
		const result = formatResidue({ re: 1, im: -2, order: 1 });
		expect(result).toBe("\\text{Res} = 1.00 - 2.00i");
	});

	it("formats an order 2 pole", () => {
		const result = formatResidue({ re: 0, im: 0, order: 2 });
		expect(result).toBe("\\text{Order 2 pole}");
	});
});
