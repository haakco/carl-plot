import { describe, expect, it } from "vitest";
import { compileExpressionToGlsl } from "./ast-to-glsl";

describe("compileExpressionToGlsl", () => {
	it("compiles supported complex functions and exponentials", () => {
		const result = compileExpressionToGlsl("sin(z) + 1/(2^z)");

		expect(result.glsl).toContain("csin(z)");
		expect(result.glsl).toContain("cexp(cmul(z, clog(vec2(2.00000000, 0.0))))");
		expect(result.latex).toContain("\\sin\\left( z\\right)");
	});

	it("rejects unsupported functions with a clear error", () => {
		expect(() => compileExpressionToGlsl("zeta(z)")).toThrowError("Unsupported function: zeta");
	});
});
