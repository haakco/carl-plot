import { describe, expect, it } from "vitest";
import { extractRootsFromExpression } from "./extract-roots";

describe("extractRootsFromExpression", () => {
	it("extracts a single zero from z", () => {
		const result = extractRootsFromExpression("z");
		expect(result).toEqual({ zeros: [{ re: 0, im: 0 }], poles: [], gain: 1 });
	});

	it("extracts zero from (z - 1)", () => {
		const result = extractRootsFromExpression("(z - 1)");
		expect(result).toEqual({ zeros: [{ re: 1, im: 0 }], poles: [], gain: 1 });
	});

	it("extracts zero from (z + 2)", () => {
		const result = extractRootsFromExpression("(z + 2)");
		expect(result).toEqual({ zeros: [{ re: -2, im: 0 }], poles: [], gain: 1 });
	});

	it("extracts zeros from product of linear factors", () => {
		const result = extractRootsFromExpression("(z - 1)(z + 2)");
		expect(result).not.toBeNull();
		expect(result?.zeros).toHaveLength(2);
		expect(result?.poles).toHaveLength(0);
		expect(result?.zeros[0]).toEqual({ re: 1, im: 0 });
		expect(result?.zeros[1]).toEqual({ re: -2, im: 0 });
	});

	it("extracts poles and zeros from a rational function", () => {
		const result = extractRootsFromExpression("(z - 1) / (z + 3)");
		expect(result).not.toBeNull();
		expect(result?.zeros).toEqual([{ re: 1, im: 0 }]);
		expect(result?.poles).toEqual([{ re: -3, im: 0 }]);
		expect(result?.gain).toBe(1);
	});

	it("extracts gain from a constant multiplier", () => {
		const result = extractRootsFromExpression("2 * (z - 1)");
		expect(result).not.toBeNull();
		expect(result?.gain).toBe(2);
		expect(result?.zeros).toEqual([{ re: 1, im: 0 }]);
	});

	it("handles repeated roots (powers)", () => {
		const result = extractRootsFromExpression("(z - 1)^2");
		expect(result).not.toBeNull();
		expect(result?.zeros).toHaveLength(2);
		expect(result?.zeros[0]).toEqual({ re: 1, im: 0 });
		expect(result?.zeros[1]).toEqual({ re: 1, im: 0 });
	});

	it("returns null for transcendental functions", () => {
		expect(extractRootsFromExpression("sin(z)")).toBeNull();
		expect(extractRootsFromExpression("exp(z)")).toBeNull();
	});

	it("returns null for invalid expressions", () => {
		expect(extractRootsFromExpression("")).toBeNull();
		expect(extractRootsFromExpression("+++")).toBeNull();
	});

	it("handles complex rational function", () => {
		const result = extractRootsFromExpression("(z - 1)(z + 2) / ((z - 3)(z + 4))");
		expect(result).not.toBeNull();
		expect(result?.zeros).toHaveLength(2);
		expect(result?.poles).toHaveLength(2);
	});
});
