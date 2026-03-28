import { describe, expect, it } from "vitest";
import { createComplex } from "./complex";
import { computeAllResidues, computeResidue, formatResidue, formatResiduePlain } from "./residue";

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

describe("computeAllResidues", () => {
	it("returns a map keyed by pole id for a single pole", () => {
		const pole = createComplex("pole", 1, 0);
		const results = computeAllResidues([pole], [], 1);
		expect(results.size).toBe(1);
		expect(results.has(pole.id)).toBe(true);
		const r = results.get(pole.id);
		expect(r).toBeDefined();
		expect(r?.re).toBeCloseTo(1);
		expect(r?.im).toBeCloseTo(0);
		expect(r?.order).toBe(1);
	});

	it("computes residues for a 2-pole system", () => {
		const p1 = createComplex("pole", 1, 0);
		const p2 = createComplex("pole", 2, 0);
		const results = computeAllResidues([p1, p2], [], 1);
		expect(results.size).toBe(2);
		// Res at z=1: 1/(1-2) = -1
		expect(results.get(p1.id)?.re).toBeCloseTo(-1);
		// Res at z=2: 1/(2-1) = 1
		expect(results.get(p2.id)?.re).toBeCloseTo(1);
	});

	it("deduplicates poles at the same location", () => {
		const p1 = createComplex("pole", 1, 0);
		const p2 = createComplex("pole", 1, 0);
		const results = computeAllResidues([p1, p2], [], 1);
		expect(results.size).toBe(2);
		// Both should have order 2 (same cached result)
		expect(results.get(p1.id)?.order).toBe(2);
		expect(results.get(p2.id)?.order).toBe(2);
	});
});

describe("formatResiduePlain", () => {
	it("formats a real-only residue", () => {
		expect(formatResiduePlain({ re: 2.5, im: 0, order: 1 })).toBe("2.50");
	});

	it("formats an imaginary-only residue", () => {
		expect(formatResiduePlain({ re: 0, im: 3, order: 1 })).toBe("3.00i");
	});

	it("formats a complex residue with positive imaginary", () => {
		expect(formatResiduePlain({ re: 1, im: 2, order: 1 })).toBe("1.00 + 2.00i");
	});

	it("formats a complex residue with negative imaginary using minus sign", () => {
		const result = formatResiduePlain({ re: 1, im: -2, order: 1 });
		// Uses unicode minus sign
		expect(result).toBe("1.00 \u2212 2.00i");
	});

	it("formats a higher-order pole", () => {
		expect(formatResiduePlain({ re: 0, im: 0, order: 3 })).toBe("order 3");
	});
});
