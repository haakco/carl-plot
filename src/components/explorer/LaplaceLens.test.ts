import { describe, expect, it } from "vitest";
import { timeDomainSamples } from "./LaplaceLens";

describe("timeDomainSamples", () => {
	it("produces cosine-like output for magnitude=1, phase=0, omega=1", () => {
		const samples = timeDomainSamples(1, 0, 1);
		expect(samples.length).toBe(40);
		// First sample at t=0: cos(0) = 1
		expect(samples[0].y).toBeCloseTo(1);
		// x values should span 0 to SPARK_W (80)
		expect(samples[0].x).toBeCloseTo(0);
		expect(samples[samples.length - 1].x).toBeCloseTo(80);
	});

	it("produces all zeros when magnitude is 0", () => {
		const samples = timeDomainSamples(0, 0, 1);
		for (const s of samples) {
			expect(s.y).toBeCloseTo(0);
		}
	});

	it("clamps magnitude to 5", () => {
		const samples = timeDomainSamples(100, 0, 1);
		for (const s of samples) {
			// y = clampedMag * cos(...), clampedMag = 5, so |y| <= 5
			expect(Math.abs(s.y)).toBeLessThanOrEqual(5 + 1e-10);
		}
	});

	it("applies phase offset correctly", () => {
		// phase = pi/2, omega = 0 => y = cos(pi/2) = 0 for all t
		const samples = timeDomainSamples(1, Math.PI / 2, 0);
		for (const s of samples) {
			expect(s.y).toBeCloseTo(0);
		}
	});

	it("returns 40 samples", () => {
		const samples = timeDomainSamples(2, 0.5, 3);
		expect(samples.length).toBe(40);
	});
});
