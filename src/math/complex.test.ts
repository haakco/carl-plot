import { describe, expect, it } from "vitest";
import { complexDistance, createComplex, flattenComplexArray, formatComplex } from "./complex";

describe("createComplex", () => {
	it("creates a pole with id, type, re, and im", () => {
		const c = createComplex("pole", 1, 2);
		expect(c.id).toBeDefined();
		expect(typeof c.id).toBe("string");
		expect(c.type).toBe("pole");
		expect(c.re).toBe(1);
		expect(c.im).toBe(2);
	});

	it("creates a zero with id, type, re, and im", () => {
		const c = createComplex("zero", -3, 4.5);
		expect(c.type).toBe("zero");
		expect(c.re).toBe(-3);
		expect(c.im).toBe(4.5);
	});

	it("generates unique ids", () => {
		const a = createComplex("pole", 0, 0);
		const b = createComplex("pole", 0, 0);
		expect(a.id).not.toBe(b.id);
	});

	it("accepts an optional pairId", () => {
		const c = createComplex("pole", 1, 1, "partner-123");
		expect(c.pairId).toBe("partner-123");
	});
});

describe("formatComplex", () => {
	it("formats zero as '0'", () => {
		const c = createComplex("pole", 0, 0);
		expect(formatComplex(c)).toBe("0");
	});

	it("formats real-only numbers", () => {
		const c = createComplex("pole", 3, 0);
		expect(formatComplex(c)).toBe("3.00");
	});

	it("formats imaginary-only numbers", () => {
		const c = createComplex("zero", 0, 2.5);
		expect(formatComplex(c)).toBe("2.50i");
	});

	it("formats negative imaginary-only numbers", () => {
		const c = createComplex("zero", 0, -1);
		expect(formatComplex(c)).toBe("-1.00i");
	});

	it("formats complex numbers with positive imaginary part", () => {
		const c = createComplex("pole", 1, 2);
		expect(formatComplex(c)).toBe("1.00 + 2.00i");
	});

	it("formats complex numbers with negative imaginary part", () => {
		const c = createComplex("pole", 1, -2);
		expect(formatComplex(c)).toBe("1.00 - 2.00i");
	});

	it("treats very small values as zero", () => {
		const c = createComplex("pole", 0.0001, 0.0005);
		expect(formatComplex(c)).toBe("0");
	});
});

describe("flattenComplexArray", () => {
	it("returns an empty Float32Array for empty input", () => {
		const result = flattenComplexArray([]);
		expect(result).toBeInstanceOf(Float32Array);
		expect(result.length).toBe(0);
	});

	it("flattens a single complex number", () => {
		const arr = [createComplex("pole", 3, 4)];
		const result = flattenComplexArray(arr);
		expect(result.length).toBe(2);
		expect(result[0]).toBeCloseTo(3);
		expect(result[1]).toBeCloseTo(4);
	});

	it("flattens multiple complex numbers in order", () => {
		const arr = [createComplex("pole", 1, 2), createComplex("zero", 3, 4)];
		const result = flattenComplexArray(arr);
		expect(result.length).toBe(4);
		expect(result[0]).toBeCloseTo(1);
		expect(result[1]).toBeCloseTo(2);
		expect(result[2]).toBeCloseTo(3);
		expect(result[3]).toBeCloseTo(4);
	});
});

describe("complexDistance", () => {
	it("returns 0 for identical points", () => {
		const a = createComplex("pole", 1, 1);
		const b = createComplex("pole", 1, 1);
		expect(complexDistance(a, b)).toBeCloseTo(0);
	});

	it("computes distance along real axis", () => {
		const a = createComplex("pole", 0, 0);
		const b = createComplex("pole", 3, 0);
		expect(complexDistance(a, b)).toBeCloseTo(3);
	});

	it("computes distance along imaginary axis", () => {
		const a = createComplex("pole", 0, 0);
		const b = createComplex("pole", 0, 4);
		expect(complexDistance(a, b)).toBeCloseTo(4);
	});

	it("computes Euclidean distance for general case", () => {
		const a = createComplex("pole", 0, 0);
		const b = createComplex("pole", 3, 4);
		expect(complexDistance(a, b)).toBeCloseTo(5);
	});
});
