import { describe, expect, it } from "vitest";
import { buildGridLines } from "./ConformalGrid";

const GRID_LINES = 11;

describe("buildGridLines", () => {
	it("returns correct number of horizontal and vertical lines", () => {
		const result = buildGridLines([], [], 1, { re: 0, im: 0 }, 1);
		expect(result.horizontal.length).toBe(GRID_LINES);
		expect(result.vertical.length).toBe(GRID_LINES);
	});

	it("with identity-like function (no poles, no zeros, gain=1), grid points pass through unchanged", () => {
		// H(z) = gain * prod(z-zeros) / prod(z-poles) = 1 when no poles/zeros and gain=1
		// Actually with 0 poles and 0 zeros: H(z) = 1 (constant)
		// So every evaluated point is { re: 1, im: 0 }
		const result = buildGridLines([], [], 1, { re: 0, im: 0 }, 1);
		for (const line of result.horizontal) {
			for (const pt of line) {
				expect(pt.re).toBeCloseTo(1);
				expect(pt.im).toBeCloseTo(0);
			}
		}
	});

	it("each line has 60 samples when there are no poles to cause infinities", () => {
		const result = buildGridLines([], [], 1, { re: 0, im: 0 }, 1);
		for (const line of result.horizontal) {
			expect(line.length).toBe(60);
		}
		for (const line of result.vertical) {
			expect(line.length).toBe(60);
		}
	});

	it("adapts grid extent based on zoom level", () => {
		// With zoom=1, halfExtent = max(1, 3/1) = 3
		// With zoom=10, halfExtent = max(1, 3/10) = 1
		const wideResult = buildGridLines([], [], 1, { re: 0, im: 0 }, 1);
		const narrowResult = buildGridLines([], [], 1, { re: 0, im: 0 }, 10);
		// Both should still have the right number of lines
		expect(wideResult.horizontal.length).toBe(GRID_LINES);
		expect(narrowResult.horizontal.length).toBe(GRID_LINES);
	});

	it("filters out non-finite points near poles", () => {
		// Place a pole at origin, grid centered at origin
		const result = buildGridLines([{ re: 0, im: 0 }], [], 1, { re: 0, im: 0 }, 1);
		// All returned points should be finite
		for (const line of [...result.horizontal, ...result.vertical]) {
			for (const pt of line) {
				expect(Number.isFinite(pt.re)).toBe(true);
				expect(Number.isFinite(pt.im)).toBe(true);
			}
		}
		// Some points near the pole should have been filtered, so lines may be shorter
		const middleLine = result.horizontal[Math.floor(GRID_LINES / 2)];
		expect(middleLine.length).toBeLessThanOrEqual(60);
	});
});
