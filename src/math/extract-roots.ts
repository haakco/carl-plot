import { parse } from "mathjs";

/**
 * Attempt to extract poles and zeros from a mathematical expression string.
 * Works for rational functions expressed as products/quotients of linear factors.
 *
 * Returns null if the expression cannot be decomposed into poles and zeros
 * (e.g. sin(z), exp(z), or other transcendental functions).
 */

interface AstNode {
	type: string;
	value?: number | string;
	name?: string;
	op?: string;
	fn?: { name: string } | string;
	args?: AstNode[];
	content?: AstNode;
}

interface ExtractedRoots {
	zeros: { re: number; im: number }[];
	poles: { re: number; im: number }[];
	gain: number;
}

/**
 * Try to extract a linear root from a node of the form (z - a), (z + a), or z.
 * Returns the root value if found, null otherwise.
 */
function tryExtractLinearRoot(node: AstNode): { re: number; im: number } | null {
	// Just "z" → root at 0
	if (node.type === "SymbolNode" && node.name === "z") {
		return { re: 0, im: 0 };
	}

	// Parenthesized
	if (node.type === "ParenthesisNode" && node.content) {
		return tryExtractLinearRoot(node.content);
	}

	if (node.type !== "OperatorNode" || !node.args || node.args.length !== 2) {
		return null;
	}

	const [left, right] = node.args;

	// (z - constant) or (z + constant)
	if (
		(node.op === "-" || node.op === "+") &&
		left.type === "SymbolNode" &&
		left.name === "z" &&
		right.type === "ConstantNode"
	) {
		const val = Number(right.value);
		if (!Number.isFinite(val)) return null;
		return { re: node.op === "-" ? val : -val, im: 0 };
	}

	// (z - (a + bi)) patterns: z - complex constant
	// This handles z - 1, z + 2, etc. For complex roots, users typically
	// use pole/zero mode directly.

	return null;
}

/**
 * Collect factors from a multiplication tree.
 * For a * b * c, returns [a, b, c].
 */
function collectMultiplicationFactors(node: AstNode): AstNode[] {
	if (node.type === "ParenthesisNode" && node.content) {
		return collectMultiplicationFactors(node.content);
	}

	if (node.type === "OperatorNode" && node.op === "*" && node.args?.length === 2) {
		return [
			...collectMultiplicationFactors(node.args[0]),
			...collectMultiplicationFactors(node.args[1]),
		];
	}

	return [node];
}

/** Try to extract a constant multiplier from a factor node. */
function tryExtractConstant(factor: AstNode): number | null {
	if (factor.type === "ConstantNode") {
		const val = Number(factor.value);
		return Number.isFinite(val) ? val : null;
	}

	// Unary minus on a constant
	if (
		factor.type === "OperatorNode" &&
		factor.op === "-" &&
		factor.args?.length === 1 &&
		factor.args[0].type === "ConstantNode"
	) {
		const val = Number(factor.args[0].value);
		return Number.isFinite(val) ? -val : null;
	}

	return null;
}

/** Try to extract repeated roots from a power expression like (z - a)^n. */
function tryExtractPowerRoots(factor: AstNode): { re: number; im: number }[] | null {
	if (factor.type !== "OperatorNode" || factor.op !== "^") return null;
	if (!factor.args || factor.args.length !== 2) return null;
	if (factor.args[1].type !== "ConstantNode") return null;

	const exponent = Number(factor.args[1].value);
	if (!Number.isInteger(exponent) || exponent <= 0) return null;

	const root = tryExtractLinearRoot(factor.args[0]);
	if (!root) return null;

	return Array.from({ length: exponent }, () => ({ ...root }));
}

/**
 * Try to extract roots from a polynomial expressed as a product of linear factors.
 * Returns the roots and any constant gain factor.
 */
function extractFactoredRoots(node: AstNode): {
	roots: { re: number; im: number }[];
	gain: number;
} | null {
	const factors = collectMultiplicationFactors(node);
	const roots: { re: number; im: number }[] = [];
	let gain = 1;

	for (const factor of factors) {
		const root = tryExtractLinearRoot(factor);
		if (root !== null) {
			roots.push(root);
			continue;
		}

		const constVal = tryExtractConstant(factor);
		if (constVal !== null) {
			gain *= constVal;
			continue;
		}

		const powerRoots = tryExtractPowerRoots(factor);
		if (powerRoots !== null) {
			roots.push(...powerRoots);
			continue;
		}

		// Unrecognized factor
		return null;
	}

	return { roots, gain };
}

/**
 * Try to extract poles and zeros from a parsed expression AST.
 * Handles:
 *   - Products of linear factors: (z-1)(z+2)
 *   - Rational functions: (z-1)(z+2) / (z-3)
 *   - With optional constant gain: 2(z-1)/(z+3)
 */
export function extractRootsFromExpression(expression: string): ExtractedRoots | null {
	let tree: AstNode;
	try {
		tree = parse(expression) as unknown as AstNode;
	} catch {
		return null;
	}

	// Unwrap parentheses at top level
	if (tree.type === "ParenthesisNode" && tree.content) {
		tree = tree.content;
	}

	// Case 1: Division — numerator gives zeros, denominator gives poles
	if (tree.type === "OperatorNode" && tree.op === "/" && tree.args?.length === 2) {
		const numResult = extractFactoredRoots(tree.args[0]);
		const denResult = extractFactoredRoots(tree.args[1]);
		if (!numResult || !denResult) return null;

		return {
			zeros: numResult.roots,
			poles: denResult.roots,
			gain: numResult.gain / denResult.gain,
		};
	}

	// Case 2: Just a product of linear factors (all zeros, no poles)
	const result = extractFactoredRoots(tree);
	if (!result) return null;

	return {
		zeros: result.roots,
		poles: [],
		gain: result.gain,
	};
}
