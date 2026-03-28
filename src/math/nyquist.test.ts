import { describe, expect, it } from "vitest";
import {
	computeFreqResponse,
	computeNyquist,
	findMargins,
} from "@/components/explorer/NyquistPlot";
import { evaluateRational } from "@/math/evaluate-rational";

describe("evaluateRational (frequency response points)", () => {
	it("evaluates H(z) = 1/(z - 0.5) on the unit circle", () => {
		// At z = 1 (omega=0): H = 1/(1 - 0.5) = 2
		const z = { re: 1, im: 0 };
		const h = evaluateRational(z, [{ re: 0.5, im: 0 }], [], 1);
		expect(h.re).toBeCloseTo(2);
		expect(h.im).toBeCloseTo(0);
	});

	it("evaluates H(z) = 1/(z - 0.5) at z = i", () => {
		// z = i, pole at 0.5: H = 1/(i - 0.5)
		// = (−0.5 − i) / (0.25 + 1) = −0.4 − 0.8i
		const z = { re: 0, im: 1 };
		const h = evaluateRational(z, [{ re: 0.5, im: 0 }], [], 1);
		expect(h.re).toBeCloseTo(-0.4);
		expect(h.im).toBeCloseTo(-0.8);
	});
});

describe("computeFreqResponse", () => {
	it("returns points for a simple first-order system", () => {
		const poles = [{ re: 0.5, im: 0 }];
		const points = computeFreqResponse(poles, [], 1);
		// Should have 257 points (0..256 inclusive)
		expect(points.length).toBe(257);
		// First point at omega=0: z = e^(j*0) = 1, H = 1/(1-0.5) = 2
		expect(points[0].re).toBeCloseTo(2);
		expect(points[0].im).toBeCloseTo(0);
	});

	it("filters out non-finite values near a pole on the unit circle", () => {
		// Pole exactly at z=1 (on unit circle at omega=0)
		const poles = [{ re: 1, im: 0 }];
		const points = computeFreqResponse(poles, [], 1);
		// Every returned point should be finite
		for (const pt of points) {
			expect(Number.isFinite(pt.re)).toBe(true);
			expect(Number.isFinite(pt.im)).toBe(true);
		}
	});
});

describe("findMargins", () => {
	it("returns null margins when curve does not cross axes", () => {
		// Points entirely in the first quadrant (positive Re, positive Im)
		const points = [
			{ re: 1, im: 1 },
			{ re: 2, im: 2 },
			{ re: 3, im: 3 },
		];
		const margins = findMargins(points);
		expect(margins.gainMarginDb).toBeNull();
		expect(margins.phaseMarginDeg).toBeNull();
	});

	it("detects gain margin when curve crosses real axis on negative side", () => {
		// Simulating a curve that crosses Im=0 on the negative real axis
		const points = [
			{ re: -0.6, im: 0.1 },
			{ re: -0.5, im: -0.1 },
		];
		const margins = findMargins(points);
		expect(margins.gainMarginDb).not.toBeNull();
		// Crossing at roughly Re=-0.55, |Re| = 0.55
		// GM = -20*log10(0.55) ≈ 5.19 dB (positive = stable)
		expect(margins.gainMarginDb).toBeGreaterThan(0);
		expect(margins.crossingRe).not.toBeNull();
		expect(margins.crossingRe).toBeLessThan(0);
		expect(margins.crossingIm).toBe(0);
	});

	it("detects negative gain margin for curve crossing past -1", () => {
		// Curve crosses the real axis at Re ≈ -1.5 (|Re| > 1)
		const points = [
			{ re: -1.5, im: 0.1 },
			{ re: -1.5, im: -0.1 },
		];
		const margins = findMargins(points);
		expect(margins.gainMarginDb).not.toBeNull();
		// GM = -20*log10(1.5) ≈ -3.52 dB (negative = unstable)
		expect(margins.gainMarginDb).toBeLessThan(0);
	});

	it("detects phase margin when magnitude crosses 1", () => {
		// Points that cross |H|=1
		const points = [
			{ re: 0.8, im: -0.8 }, // |H| ≈ 1.13
			{ re: 0.6, im: -0.6 }, // |H| ≈ 0.85
		];
		const margins = findMargins(points);
		expect(margins.phaseMarginDeg).not.toBeNull();
	});
});

describe("computeNyquist", () => {
	it("returns a stable system analysis for pole inside unit circle", () => {
		// H(z) = 1/(z - 0.5), stable
		const data = computeNyquist([{ re: 0.5, im: 0 }], [], 1);
		expect(data.points.length).toBeGreaterThan(0);
		// First point: H(1) = 2
		expect(data.points[0].re).toBeCloseTo(2);
	});
});
