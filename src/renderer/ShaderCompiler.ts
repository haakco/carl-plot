import { createProgram, createShader, getUniformLocations } from "@/lib/webgl-utils";
import { buildExpressionShader, compileExpressionToGlsl } from "@/math/ast-to-glsl";

export interface CompiledProgram {
	program: WebGLProgram;
	uniforms: Record<string, WebGLUniformLocation | null>;
	vertexShader: WebGLShader;
	fragmentShader: WebGLShader;
}

export interface CompilationResult {
	success: boolean;
	program?: CompiledProgram;
	latex?: string;
	error?: string;
}

const EXPRESSION_UNIFORMS = [
	"u_resolution",
	"u_center",
	"u_zoom",
	"u_contourDensity",
	"u_showModContours",
	"u_showPhaseContours",
	"u_showGrid",
];

export class ShaderCompiler {
	private gl: WebGL2RenderingContext;
	private vertexSource: string;
	private fragmentTemplate: string;

	constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentTemplate: string) {
		this.gl = gl;
		this.vertexSource = vertexSource;
		this.fragmentTemplate = fragmentTemplate;
	}

	compile(expression: string): CompilationResult {
		const gl = this.gl;

		let glslBody: string;
		let latex: string;
		try {
			const result = compileExpressionToGlsl(expression);
			glslBody = result.glsl;
			latex = result.latex;
		} catch (e) {
			return {
				success: false,
				error: e instanceof Error ? e.message : "Failed to parse expression",
			};
		}

		const fragSource = buildExpressionShader(this.fragmentTemplate, glslBody);

		let vertexShader: WebGLShader;
		let fragmentShader: WebGLShader;
		try {
			vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexSource);
			fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragSource);
		} catch (e) {
			return {
				success: false,
				error: e instanceof Error ? e.message : "Shader compilation failed",
			};
		}

		let program: WebGLProgram;
		try {
			program = createProgram(gl, vertexShader, fragmentShader);
		} catch (e) {
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return {
				success: false,
				error: e instanceof Error ? e.message : "Shader linking failed",
			};
		}

		const uniforms = getUniformLocations(gl, program, EXPRESSION_UNIFORMS);

		return {
			success: true,
			latex,
			program: { program, uniforms, vertexShader, fragmentShader },
		};
	}

	destroyProgram(compiled: CompiledProgram): void {
		const gl = this.gl;
		gl.deleteProgram(compiled.program);
		gl.deleteShader(compiled.vertexShader);
		gl.deleteShader(compiled.fragmentShader);
	}
}
