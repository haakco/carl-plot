import { describe, expect, it } from "vitest";
import { getStabilityColor, snapToGrid } from "./singularity-helpers";

describe("getStabilityColor", () => {
	it("returns green for poles inside unit circle", () => {
		expect(getStabilityColor(0.5, 0)).toContain("145"); // green hue
	});

	it("returns green for pole at origin", () => {
		expect(getStabilityColor(0, 0)).toContain("145");
	});

	it("returns yellow for poles near unit circle", () => {
		expect(getStabilityColor(1, 0)).toContain("85"); // yellow hue
		expect(getStabilityColor(0.98, 0)).toContain("85");
	});

	it("returns red for poles outside unit circle", () => {
		expect(getStabilityColor(1.5, 0)).toContain("25"); // red hue
		expect(getStabilityColor(2, 3)).toContain("25");
	});

	it("uses magnitude for complex poles", () => {
		// |0.5 + 0.5i| ≈ 0.707 < 0.95 → stable
		expect(getStabilityColor(0.5, 0.5)).toContain("145");
		// |0.7 + 0.7i| ≈ 0.99 → marginal
		expect(getStabilityColor(0.7, 0.7)).toContain("85");
	});
});

describe("snapToGrid", () => {
	it("snaps to quarter increments", () => {
		expect(snapToGrid(0.13)).toBe(0.25);
		expect(snapToGrid(0.37)).toBe(0.25);
		expect(snapToGrid(0.63)).toBe(0.75);
	});

	it("preserves exact quarter values", () => {
		expect(snapToGrid(0.5)).toBe(0.5);
		expect(snapToGrid(1.0)).toBe(1.0);
		expect(snapToGrid(-0.25)).toBe(-0.25);
	});
});
