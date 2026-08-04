import { compile, complex, type Complex as MathComplex } from "mathjs";

interface EvalResult {
	mag: number;
	arg: number;
}

export interface EvaluatedExpression {
	re: number;
	im: number;
	mag: number;
	arg: number;
}

function coerceResult(value: unknown): EvaluatedExpression {
	if (typeof value === "number") {
		return {
			re: value,
			im: 0,
			mag: Math.abs(value),
			arg: value >= 0 ? 0 : Math.PI,
		};
	}

	const w = value as MathComplex;
	const re = (w as unknown as { re: number }).re ?? 0;
	const im = (w as unknown as { im: number }).im ?? 0;
	return {
		re,
		im,
		mag: Math.sqrt(re * re + im * im),
		arg: Math.atan2(im, re),
	};
}

export function createExpressionValueEvaluator(
	expression: string,
): ((re: number, im: number) => EvaluatedExpression | null) | null {
	try {
		const compiled = compile(expression);
		return (re: number, im: number): EvaluatedExpression | null => {
			try {
				const z = complex(re, im);
				return coerceResult(compiled.evaluate({ z, i: complex(0, 1), e: Math.E, pi: Math.PI }));
			} catch {
				return null;
			}
		};
	} catch {
		return null;
	}
}

export function createExpressionEvaluator(
	expression: string,
): ((re: number, im: number) => EvalResult) | null {
	const evaluateValue = createExpressionValueEvaluator(expression);
	if (!evaluateValue) return null;

	return (re: number, im: number): EvalResult => {
		const value = evaluateValue(re, im);
		if (!value) {
			return { mag: Number.POSITIVE_INFINITY, arg: 0 };
		}
		return { mag: value.mag, arg: value.arg };
	};
}
