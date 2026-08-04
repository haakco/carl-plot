import { describe, expect, it } from "vitest";
import { createComplex } from "./complex";
import { buildFactoredLaTeX } from "./formula-latex";

describe("buildFactoredLaTeX", () => {
	it("returns f(z) = 1 with no poles or zeros and gain=1", () => {
		const result = buildFactoredLaTeX([], [], 1);
		expect(result).toBe("f(z) = 1");
	});

	it("includes gain prefix when gain != 1", () => {
		const result = buildFactoredLaTeX([], [], 3);
		expect(result).toBe("f(z) = 3 \\cdot 1");
	});

	it("renders poles only as a fraction", () => {
		const poles = [createComplex("pole", 1, 0)];
		const result = buildFactoredLaTeX([], poles, 1);
		expect(result).toBe("f(z) = \\frac{1}{(z - 1.00)}");
	});

	it("renders zeros only without fraction", () => {
		const zeros = [createComplex("zero", 0, 0)];
		const result = buildFactoredLaTeX(zeros, [], 1);
		expect(result).toBe("f(z) = (z - 0)");
	});

	it("renders both poles and zeros as a fraction", () => {
		const zeros = [createComplex("zero", 0, 0)];
		const poles = [createComplex("pole", 2, 0)];
		const result = buildFactoredLaTeX(zeros, poles, 1);
		expect(result).toBe("f(z) = \\frac{(z - 0)}{(z - 2.00)}");
	});

	it("renders with gain, zeros, and poles", () => {
		const zeros = [createComplex("zero", 1, 0)];
		const poles = [createComplex("pole", -1, 0)];
		const result = buildFactoredLaTeX(zeros, poles, 2);
		expect(result).toBe("f(z) = 2 \\cdot \\frac{(z - 1.00)}{(z - -1.00)}");
	});

	it("handles complex-valued poles and zeros", () => {
		const zeros = [createComplex("zero", 1, 2)];
		const poles = [createComplex("pole", 0, -3)];
		const result = buildFactoredLaTeX(zeros, poles, 1);
		expect(result).toBe("f(z) = \\frac{(z - 1.00 + 2.00i)}{(z - -3.00i)}");
	});

	it("renders multiple poles and zeros", () => {
		const zeros = [createComplex("zero", 0, 0), createComplex("zero", 1, 0)];
		const poles = [createComplex("pole", 2, 0), createComplex("pole", 3, 0)];
		const result = buildFactoredLaTeX(zeros, poles, 1);
		expect(result).toBe("f(z) = \\frac{(z - 0)(z - 1.00)}{(z - 2.00)(z - 3.00)}");
	});
});
