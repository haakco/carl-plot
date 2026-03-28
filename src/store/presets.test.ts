import { describe, expect, it } from "vitest";
import { presets } from "./presets";

describe("presets", () => {
	it("all presets have required fields", () => {
		for (const preset of presets) {
			expect(preset.name).toBeDefined();
			expect(typeof preset.name).toBe("string");
			expect(preset.description).toBeDefined();
			expect(typeof preset.description).toBe("string");
			expect(Array.isArray(preset.poles)).toBe(true);
			expect(Array.isArray(preset.zeros)).toBe(true);
			expect(typeof preset.gain).toBe("number");
			expect(preset.center).toBeDefined();
			expect(typeof preset.center.re).toBe("number");
			expect(typeof preset.center.im).toBe("number");
			expect(typeof preset.zoom).toBe("number");
		}
	});

	it("each preset's poles have valid id, type, re, im fields", () => {
		for (const preset of presets) {
			for (const pole of preset.poles) {
				expect(typeof pole.id).toBe("string");
				expect(pole.type).toBe("pole");
				expect(typeof pole.re).toBe("number");
				expect(typeof pole.im).toBe("number");
			}
		}
	});

	it("each preset's zeros have valid id, type, re, im fields", () => {
		for (const preset of presets) {
			for (const zero of preset.zeros) {
				expect(typeof zero.id).toBe("string");
				expect(zero.type).toBe("zero");
				expect(typeof zero.re).toBe("number");
				expect(typeof zero.im).toBe("number");
			}
		}
	});

	describe("conjugate pair presets", () => {
		const conjugatePresetNames = ["Conjugate poles", "Butterworth lowpass", "Lightly damped pair"];

		function verifyConjugateLinking(preset: (typeof presets)[number]) {
			const polesWithPairs = preset.poles.filter((p) => p.pairId);
			expect(polesWithPairs.length).toBeGreaterThanOrEqual(2);

			for (const pole of polesWithPairs) {
				if (!pole.pairId) continue;
				const partner = preset.poles.find((p) => p.id === pole.pairId);
				expect(partner).toBeDefined();
				if (!partner) continue;
				expect(partner.pairId).toBe(pole.id);
				expect(partner.re).toBeCloseTo(pole.re);
				expect(partner.im).toBeCloseTo(-pole.im);
			}
		}

		for (const name of conjugatePresetNames) {
			it(`"${name}" has proper pairId linking`, () => {
				const preset = presets.find((p) => p.name === name);
				expect(preset).toBeDefined();
				if (!preset) return;
				verifyConjugateLinking(preset);
			});
		}
	});
});
