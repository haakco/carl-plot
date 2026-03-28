import { compile, complex, type Complex as MathComplex } from "mathjs";

interface EvalResult {
	mag: number;
	arg: number;
}

export function createExpressionEvaluator(
	expression: string,
): ((re: number, im: number) => EvalResult) | null {
	try {
		const compiled = compile(expression);
		return (re: number, im: number): EvalResult => {
			try {
				const z = complex(re, im);
				const result = compiled.evaluate({ z, i: complex(0, 1), e: Math.E, pi: Math.PI });

				if (typeof result === "number") {
					return { mag: Math.abs(result), arg: result >= 0 ? 0 : Math.PI };
				}

				const w = result as MathComplex;
				const wRe = (w as unknown as { re: number }).re ?? 0;
				const wIm = (w as unknown as { im: number }).im ?? 0;
				return {
					mag: Math.sqrt(wRe * wRe + wIm * wIm),
					arg: Math.atan2(wIm, wRe),
				};
			} catch {
				// Signal evaluation failure (e.g. division by zero at a pole)
				// with Infinity so the renderer shows a singularity, not a fake zero
				return { mag: Number.POSITIVE_INFINITY, arg: 0 };
			}
		};
	} catch {
		return null;
	}
}
