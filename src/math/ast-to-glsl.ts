import { parse } from "mathjs";

class GlslCompileError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GlslCompileError";
	}
}

/**
 * math.js MathNode has many subtypes but no discriminated union in its types.
 * We use a loose interface for the properties we access on each node type.
 */
interface AstNode {
	type: string;
	value?: number | string;
	name?: string;
	op?: string;
	fn?: { name: string } | string;
	args?: AstNode[];
	content?: AstNode;
	toTex?: () => string;
}

const KNOWN_CONSTANTS: Record<string, string> = {
	e: "vec2(2.718281828459045, 0.0)",
	pi: "vec2(3.141592653589793, 0.0)",
	i: "vec2(0.0, 1.0)",
};

const FUNCTION_MAP: Record<string, string> = {
	sin: "csin",
	cos: "ccos",
	exp: "cexp",
	log: "clog",
	sqrt: "csqrt",
	abs: "cabs_vec",
	conj: "cconj",
	arg: "carg_vec",
	tan: "ctan",
	sinh: "csinh",
	cosh: "ccosh",
};

export const SUPPORTED_EXPRESSION_FUNCTIONS = Object.freeze(Object.keys(FUNCTION_MAP));

const BINARY_OP_MAP: Record<string, string | null> = {
	"+": null,
	"-": null,
	"*": "cmul",
	"/": "cdiv",
};

function compileUnaryOp(op: string, operand: string): string {
	if (op === "-") return `(-${operand})`;
	if (op === "+") return operand;
	throw new GlslCompileError(`Unknown unary operator: ${op}`);
}

function compileBinaryOp(op: string, args: AstNode[]): string {
	if (op === "^") return compilePow(args[0], args[1]);

	const fn = BINARY_OP_MAP[op];
	if (fn === undefined) throw new GlslCompileError(`Unknown operator: ${op}`);

	const left = walkNode(args[0]);
	const right = walkNode(args[1]);
	return fn ? `${fn}(${left}, ${right})` : `(${left} ${op} ${right})`;
}

function compileOperator(node: AstNode): string {
	const op = node.op ?? "";
	const args = node.args ?? [];

	if (args.length === 1) return compileUnaryOp(op, walkNode(args[0]));
	if (args.length === 2) return compileBinaryOp(op, args);
	throw new GlslCompileError(`Unexpected argument count for operator ${op}`);
}

function compileFunctionCall(node: AstNode): string {
	const fn = node.fn;
	const fnName = fn && typeof fn === "object" && "name" in fn ? fn.name : String(fn);
	const args = node.args ?? [];

	const glslFn = FUNCTION_MAP[fnName];
	if (!glslFn) throw new GlslCompileError(`Unsupported function: ${fnName}`);
	if (args.length !== 1)
		throw new GlslCompileError(`${fnName}() expects 1 argument, got ${args.length}`);

	return `${glslFn}(${walkNode(args[0])})`;
}

function walkNode(node: AstNode): string {
	switch (node.type) {
		case "ConstantNode":
			return `vec2(${Number(node.value).toFixed(8)}, 0.0)`;

		case "SymbolNode": {
			const name = node.name ?? "";
			if (name === "z") return "z";
			if (KNOWN_CONSTANTS[name]) return KNOWN_CONSTANTS[name];
			throw new GlslCompileError(`Unknown variable: ${name}`);
		}

		case "OperatorNode":
			return compileOperator(node);

		case "FunctionNode":
			return compileFunctionCall(node);

		case "ParenthesisNode": {
			if (!node.content) throw new GlslCompileError("Empty parenthesis node");
			return walkNode(node.content);
		}

		default:
			throw new GlslCompileError(`Unsupported node type: ${node.type}`);
	}
}

function compilePow(base: AstNode, exponent: AstNode): string {
	if (base.type === "SymbolNode" && base.name === "e") {
		return `cexp(${walkNode(exponent)})`;
	}
	if (exponent.type === "ConstantNode") {
		return `cpow(${walkNode(base)}, ${Number(exponent.value).toFixed(8)})`;
	}
	return `cexp(cmul(${walkNode(exponent)}, clog(${walkNode(base)})))`;
}

export interface CompileResult {
	glsl: string;
	latex: string;
}

export function compileExpressionToGlsl(expression: string): CompileResult {
	const tree = parse(expression) as unknown as AstNode;
	const glslBody = walkNode(tree);
	const latex = tree.toTex?.() ?? expression;

	return {
		glsl: `return ${glslBody};`,
		latex,
	};
}

export function buildExpressionShader(baseShader: string, expressionGlsl: string): string {
	const evalFnRegex = /vec2 evaluateFunction\(vec2 z\)\s*\{[\s\S]*?\n\}/;
	return baseShader.replace(
		evalFnRegex,
		`vec2 evaluateFunction(vec2 z) {\n    ${expressionGlsl}\n}`,
	);
}
