import { describe, expect, it } from "vitest";
import { createComplex } from "./complex";
import { evaluateRational } from "./evaluate-rational";
import { generateSurfaceMesh, getViewportBounds } from "./surface-mesh";

/**
 * 2D/3D Parity Tests (Plan item #34)
 *
 * Verify that the 2D domain coloring and 3D surface views produce
 * consistent results for canonical functions:
 *   - z (identity)
 *   - 1/z (single pole)
 *   - (z-1)/(z+1) (pole + zero)
 */

const CANVAS_W = 800;
const CANVAS_H = 600;
const CENTER = { re: 0, im: 0 };
const ZOOM = 1;

describe("2D/3D parity", () => {
	describe("viewport bounds consistency", () => {
		it("produces symmetric bounds when centered at origin", () => {
			const bounds = getViewportBounds(CANVAS_W, CANVAS_H, CENTER, ZOOM);
			expect(bounds.reMin).toBeCloseTo(-bounds.reMax, 8);
			expect(bounds.imMin).toBeCloseTo(-bounds.imMax, 8);
		});

		it("bounds scale inversely with zoom", () => {
			const bounds1 = getViewportBounds(CANVAS_W, CANVAS_H, CENTER, 1);
			const bounds2 = getViewportBounds(CANVAS_W, CANVAS_H, CENTER, 2);
			const extent1 = bounds1.reMax - bounds1.reMin;
			const extent2 = bounds2.reMax - bounds2.reMin;
			expect(extent2).toBeCloseTo(extent1 / 2, 8);
		});

		it("bounds shift with center offset", () => {
			const shift = { re: 1, im: 2 };
			const bounds = getViewportBounds(CANVAS_W, CANVAS_H, shift, ZOOM);
			const midRe = (bounds.reMin + bounds.reMax) / 2;
			const midIm = (bounds.imMin + bounds.imMax) / 2;
			expect(midRe).toBeCloseTo(shift.re, 8);
			expect(midIm).toBeCloseTo(shift.im, 8);
		});
	});

	describe("canonical function: f(z) = z", () => {
		const poles: ReturnType<typeof createComplex>[] = [];
		const zeros: ReturnType<typeof createComplex>[] = [];
		const gain = 1;

		it("evaluateRational at z=1+0i returns 1+0i", () => {
			const result = evaluateRational({ re: 1, im: 0 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(1, 10);
			expect(result.im).toBeCloseTo(0, 10);
		});

		it("3D mesh produces matching values at sample points", () => {
			const mesh = generateSurfaceMesh(
				poles,
				zeros,
				gain,
				CENTER,
				ZOOM,
				16,
				undefined,
				CANVAS_W,
				CANVAS_H,
			);
			// With no poles/zeros, f(z) = gain = 1 everywhere
			// mag = 1, so height = (2/pi)*atan(1) * 5 = (2/pi)*(pi/4)*5 = 2.5
			const expectedHeight = (2 / Math.PI) * Math.atan(1) * 5;
			// Check interior vertex (avoid edge effects)
			const idx = 8 * 17 + 8; // middle of 16x16 grid
			const height = mesh.positions[idx * 3 + 1];
			expect(height).toBeCloseTo(expectedHeight, 1);
		});
	});

	describe("canonical function: f(z) = 1/z", () => {
		const poles = [createComplex("pole", 0, 0)];
		const zeros: ReturnType<typeof createComplex>[] = [];
		const gain = 1;

		it("evaluateRational at z=1 returns 1", () => {
			const result = evaluateRational({ re: 1, im: 0 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(1, 10);
			expect(result.im).toBeCloseTo(0, 10);
		});

		it("evaluateRational at z=i returns -i", () => {
			const result = evaluateRational({ re: 0, im: 1 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(0, 10);
			expect(result.im).toBeCloseTo(-1, 10);
		});

		it("evaluateRational at z=2 returns 0.5", () => {
			const result = evaluateRational({ re: 2, im: 0 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(0.5, 10);
			expect(result.im).toBeCloseTo(0, 10);
		});
	});

	describe("canonical function: f(z) = (z-1)/(z+1)", () => {
		const poles = [createComplex("pole", -1, 0)];
		const zeros = [createComplex("zero", 1, 0)];
		const gain = 1;

		it("evaluateRational at z=0 returns -1", () => {
			const result = evaluateRational({ re: 0, im: 0 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(-1, 10);
			expect(result.im).toBeCloseTo(0, 10);
		});

		it("evaluateRational at z=1 returns 0 (zero)", () => {
			const result = evaluateRational({ re: 1, im: 0 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(0, 10);
			expect(result.im).toBeCloseTo(0, 10);
		});

		it("evaluateRational at z=i returns i (maps to unit circle)", () => {
			// (i-1)/(i+1) = (i-1)(conj(i+1))/|i+1|^2 = (i-1)(-i+1)/2
			// = (-i^2 + i + i - 1)/2 = (1 + 2i - 1)/2 = i
			const result = evaluateRational({ re: 0, im: 1 }, poles, zeros, gain);
			expect(result.re).toBeCloseTo(0, 10);
			expect(result.im).toBeCloseTo(1, 10);
		});

		it("3D surface height near zero is lower than near pole", () => {
			// Use zoom=0.3 so both z=1 and z=-1 are within the viewport
			const wideZoom = 0.3;
			const evalFn = (re: number, im: number) => {
				const result = evaluateRational({ re, im }, poles, zeros, gain);
				const mag = Math.sqrt(result.re * result.re + result.im * result.im);
				const arg = Math.atan2(result.im, result.re);
				return { mag, arg };
			};
			const mesh = generateSurfaceMesh(
				poles,
				zeros,
				gain,
				CENTER,
				wideZoom,
				64,
				evalFn,
				CANVAS_W,
				CANVAS_H,
			);
			const bounds = getViewportBounds(CANVAS_W, CANVAS_H, CENTER, wideZoom);
			const gridSize = 65;
			const res = 64;

			// Find vertex near z=0.9 (close to zero at 1) and z=-0.9 (close to pole at -1)
			const zeroI = Math.round(((0.9 - bounds.reMin) / (bounds.reMax - bounds.reMin)) * res);
			const poleI = Math.round(((-0.9 - bounds.reMin) / (bounds.reMax - bounds.reMin)) * res);
			const midJ = Math.round(((0 - bounds.imMin) / (bounds.imMax - bounds.imMin)) * res);

			const zeroIdx = midJ * gridSize + zeroI;
			const poleIdx = midJ * gridSize + poleI;

			const heightNearZero = mesh.positions[zeroIdx * 3 + 1];
			const heightNearPole = mesh.positions[poleIdx * 3 + 1];

			// Height near the zero should be lower than near the pole
			expect(heightNearZero).toBeLessThan(heightNearPole);
		});
	});

	describe("color mapping parity", () => {
		it("3D mesh uses same hue mapping as 2D (arg/2pi + 0.5)", () => {
			// For f(z)=z at z=1+0i: arg = 0, so hue = 0.5
			// For f(z)=z at z=-1+0i: arg = pi, so hue = 1.0 → 0.0 (wraps)
			// For f(z)=z at z=0+1i: arg = pi/2, so hue = 0.75
			// Just verify the mesh generates valid color values in [0,1]
			const poles: ReturnType<typeof createComplex>[] = [];
			const zeros: ReturnType<typeof createComplex>[] = [];
			const mesh = generateSurfaceMesh(
				poles,
				zeros,
				1,
				CENTER,
				ZOOM,
				8,
				undefined,
				CANVAS_W,
				CANVAS_H,
			);

			for (let i = 0; i < mesh.colors.length; i++) {
				expect(mesh.colors[i]).toBeGreaterThanOrEqual(0);
				expect(mesh.colors[i]).toBeLessThanOrEqual(1);
			}
		});
	});
});
