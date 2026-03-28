import { describe, expect, it } from "vitest";
import { createComplex } from "./complex";
import { computeImpulseResponse, isSystemStable } from "./impulse-response";

describe("computeImpulseResponse", () => {
	it("returns gain * delta[n] when there are no poles", () => {
		const h = computeImpulseResponse([], [], 3, 8);
		expect(h[0]).toBeCloseTo(3);
		for (let n = 1; n < 8; n++) {
			expect(h[n]).toBeCloseTo(0);
		}
	});

	it("computes h[n] = p^n for a single real pole with unity gain", () => {
		const pole = createComplex("pole", 0.5, 0);
		const h = computeImpulseResponse([pole], [], 1, 8);
		for (let n = 0; n < 8; n++) {
			expect(h[n]).toBeCloseTo(0.5 ** n);
		}
	});

	it("decays for a stable pole inside the unit circle", () => {
		const pole = createComplex("pole", 0.8, 0);
		const h = computeImpulseResponse([pole], [], 1, 20);
		// Each successive sample should be smaller in magnitude
		for (let n = 1; n < 20; n++) {
			expect(Math.abs(h[n])).toBeLessThanOrEqual(Math.abs(h[n - 1]) + 1e-10);
		}
	});

	it("grows for an unstable pole outside the unit circle", () => {
		const pole = createComplex("pole", 1.2, 0);
		const h = computeImpulseResponse([pole], [], 1, 10);
		// Each successive sample should grow
		for (let n = 1; n < 10; n++) {
			expect(Math.abs(h[n])).toBeGreaterThan(Math.abs(h[n - 1]) - 1e-10);
		}
	});

	it("produces oscillatory response for conjugate pole pair", () => {
		const p1 = createComplex("pole", 0, 0.9);
		const p2 = createComplex("pole", 0, -0.9);
		p1.pairId = p2.id;
		p2.pairId = p1.id;
		const h = computeImpulseResponse([p1, p2], [], 1, 16);
		// Should oscillate: not all same sign
		const signs = h.slice(0, 16).map((v) => Math.sign(v));
		const hasPositive = signs.some((s) => s > 0);
		const hasNegative = signs.some((s) => s < 0);
		expect(hasPositive && hasNegative).toBe(true);
	});

	it("computes FIR response for zero-only system (H(z) = z)", () => {
		const zero = createComplex("zero", 0, 0);
		const h = computeImpulseResponse([], [zero], 1, 8);
		expect(h[0]).toBeCloseTo(1);
		expect(h[1]).toBeCloseTo(0);
		expect(h[2]).toBeCloseTo(0);
	});

	it("computes FIR response for H(z) = z - 1 (zero at 1)", () => {
		const zero = createComplex("zero", 1, 0);
		const h = computeImpulseResponse([], [zero], 1, 8);
		// H(z) = z - 1 → h = [1, -1, 0, 0, ...]
		expect(h[0]).toBeCloseTo(1);
		expect(h[1]).toBeCloseTo(-1);
		expect(h[2]).toBeCloseTo(0);
	});

	it("computes FIR response for two zeros", () => {
		const z1 = createComplex("zero", 1, 0);
		const z2 = createComplex("zero", -1, 0);
		const h = computeImpulseResponse([], [z1, z2], 2, 8);
		// H(z) = 2*(z-1)*(z+1) = 2*(z^2-1) → h = [2, 0, -2, 0, ...]
		expect(h[0]).toBeCloseTo(2);
		expect(h[1]).toBeCloseTo(0);
		expect(h[2]).toBeCloseTo(-2);
		expect(h[3]).toBeCloseTo(0);
	});

	it("returns NaN for systems with only repeated poles", () => {
		const p1 = createComplex("pole", 0.5, 0);
		const p2 = createComplex("pole", 0.5, 0);
		const h = computeImpulseResponse([p1, p2], [], 1, 8);
		expect(Number.isNaN(h[0])).toBe(true);
		expect(Number.isNaN(h[4])).toBe(true);
	});

	it("returns NaN when repeated poles are mixed with simple poles", () => {
		const p1 = createComplex("pole", 0.5, 0);
		const p2 = createComplex("pole", 0.5, 0);
		const p3 = createComplex("pole", 0.2, 0);
		const h = computeImpulseResponse([p1, p2, p3], [], 1, 8);
		expect(Number.isNaN(h[0])).toBe(true);
		expect(Number.isNaN(h[4])).toBe(true);
	});
});

describe("isSystemStable", () => {
	it("returns true when all poles are inside unit circle", () => {
		expect(isSystemStable([createComplex("pole", 0.5, 0.3)])).toBe(true);
	});

	it("returns false when a pole is outside unit circle", () => {
		expect(isSystemStable([createComplex("pole", 1.1, 0)])).toBe(false);
	});

	it("returns true for empty poles", () => {
		expect(isSystemStable([])).toBe(true);
	});
});
