import {
	createProgram,
	createShader,
	getUniformLocations,
	setupFullscreenQuad,
} from "@/lib/webgl-utils";
import { flattenComplexArray } from "@/math/complex";
import { PerformanceMonitor } from "@/renderer/PerformanceMonitor";
import { type CompiledProgram, ShaderCompiler } from "@/renderer/ShaderCompiler";
import fragmentSource from "@/shaders/domain-coloring.frag";
import expressionFragSource from "@/shaders/expression-coloring.frag";
import vertexSource from "@/shaders/fullscreen.vert";
import { type ExplorerState, explorerStore } from "@/store/explorer-store";

const MAX_SINGULARITIES = 32;
const MIN_DPR = 0.5;
const MAX_DPR = 2;

const UNIFORM_NAMES = [
	"u_resolution",
	"u_center",
	"u_zoom",
	"u_numPoles",
	"u_numZeros",
	"u_gain",
	"u_contourDensity",
	"u_showModContours",
	"u_showPhaseContours",
	"u_showGrid",
	...Array.from({ length: MAX_SINGULARITIES }, (_, i) => `u_poles[${i}]`),
	...Array.from({ length: MAX_SINGULARITIES }, (_, i) => `u_zeros[${i}]`),
];

export class DomainColoringRenderer {
	private canvas: HTMLCanvasElement;
	private gl: WebGL2RenderingContext | null = null;
	private program: WebGLProgram | null = null;
	private vertexShader: WebGLShader | null = null;
	private fragmentShader: WebGLShader | null = null;
	private quadBuffer: WebGLBuffer | null = null;
	private uniforms: Record<string, WebGLUniformLocation | null> = {};
	private animationFrameId: number | null = null;
	private dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
	private lastFrameTime = 0;
	private performanceMonitor: PerformanceMonitor;

	private shaderCompiler: ShaderCompiler | null = null;
	private expressionProgram: CompiledProgram | null = null;
	private currentExpression = "";
	private expressionError: string | null = null;
	private expressionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	private boundContextLost: (event: Event) => void;
	private boundContextRestored: () => void;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.boundContextLost = this.handleContextLoss.bind(this);
		this.boundContextRestored = this.handleContextRestored.bind(this);
		this.performanceMonitor = new PerformanceMonitor(
			() => this.reduceQuality(),
			() => this.increaseQuality(),
		);
	}

	init(): void {
		this.canvas.addEventListener("webglcontextlost", this.boundContextLost);
		this.canvas.addEventListener("webglcontextrestored", this.boundContextRestored);

		const gl = this.canvas.getContext("webgl2", {
			antialias: false,
			preserveDrawingBuffer: false,
		});
		if (!gl) {
			throw new Error("WebGL2 is not supported in this browser");
		}
		this.gl = gl;

		this.vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
		this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
		this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
		this.uniforms = getUniformLocations(gl, this.program, UNIFORM_NAMES);
		this.quadBuffer = setupFullscreenQuad(gl);
		this.shaderCompiler = new ShaderCompiler(gl, vertexSource, expressionFragSource);
	}

	render(): void {
		const gl = this.gl;
		if (!gl) return;

		const state = explorerStore.state;

		if (state.mode === "expression" && state.expression) {
			this.ensureExpressionCompiled(state.expression);
		}

		const exprProg = state.mode === "expression" ? this.expressionProgram : null;
		const activeProgram = exprProg?.program ?? this.program;
		const activeUniforms = exprProg?.uniforms ?? this.uniforms;

		if (!activeProgram) return;

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		// biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL call, not a React hook
		gl.useProgram(activeProgram);

		this.setCommonUniforms(gl, activeUniforms, state);

		if (!exprProg) {
			this.setPoleZeroUniforms(gl, state);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	private setCommonUniforms(
		gl: WebGL2RenderingContext,
		uniforms: Record<string, WebGLUniformLocation | null>,
		state: ExplorerState,
	): void {
		gl.uniform2f(uniforms.u_resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.uniform2f(uniforms.u_center, state.center.re, state.center.im);
		gl.uniform1f(uniforms.u_zoom, state.zoom);
		gl.uniform1f(uniforms.u_contourDensity, state.contourDensity);
		gl.uniform1i(uniforms.u_showModContours, state.showModContours ? 1 : 0);
		gl.uniform1i(uniforms.u_showPhaseContours, state.showPhaseContours ? 1 : 0);
		gl.uniform1i(uniforms.u_showGrid, state.showGrid ? 1 : 0);
	}

	private setPoleZeroUniforms(gl: WebGL2RenderingContext, state: ExplorerState): void {
		gl.uniform1i(this.uniforms.u_numPoles, state.poles.length);
		gl.uniform1i(this.uniforms.u_numZeros, state.zeros.length);
		gl.uniform1f(this.uniforms.u_gain, state.gain);

		const polesFlat = flattenComplexArray(state.poles);
		for (let i = 0; i < state.poles.length && i < MAX_SINGULARITIES; i++) {
			gl.uniform2f(this.uniforms[`u_poles[${i}]`], polesFlat[i * 2], polesFlat[i * 2 + 1]);
		}

		const zerosFlat = flattenComplexArray(state.zeros);
		for (let i = 0; i < state.zeros.length && i < MAX_SINGULARITIES; i++) {
			gl.uniform2f(this.uniforms[`u_zeros[${i}]`], zerosFlat[i * 2], zerosFlat[i * 2 + 1]);
		}
	}

	private ensureExpressionCompiled(expression: string): void {
		if (expression === this.currentExpression) return;
		this.currentExpression = expression;

		if (this.expressionDebounceTimer) {
			clearTimeout(this.expressionDebounceTimer);
		}

		this.expressionDebounceTimer = setTimeout(() => {
			this.compileExpression(expression);
		}, 300);
	}

	private compileExpression(expression: string): void {
		if (!this.shaderCompiler) return;

		const result = this.shaderCompiler.compile(expression);
		if (result.success && result.program) {
			if (this.expressionProgram) {
				this.shaderCompiler.destroyProgram(this.expressionProgram);
			}
			this.expressionProgram = result.program;
			this.expressionError = null;

			explorerStore.setState((prev) => ({
				...prev,
				expressionError: null,
				expressionLatex: result.latex ?? "",
			}));
		} else {
			this.expressionError = result.error ?? "Compilation failed";
			explorerStore.setState((prev) => ({
				...prev,
				expressionError: result.error ?? "Compilation failed",
			}));
		}
	}

	getExpressionError(): string | null {
		return this.expressionError;
	}

	startLoop(): void {
		this.lastFrameTime = performance.now();
		const loop = (): void => {
			const now = performance.now();
			const dt = now - this.lastFrameTime;
			this.lastFrameTime = now;
			this.performanceMonitor.measureFrame(dt);

			this.render();
			this.animationFrameId = requestAnimationFrame(loop);
		};
		this.animationFrameId = requestAnimationFrame(loop);
	}

	stopLoop(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	resize(width: number, height: number): void {
		this.canvas.width = Math.round(width * this.dpr);
		this.canvas.height = Math.round(height * this.dpr);

		if (this.gl) {
			this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		}
	}

	private reduceQuality(): void {
		if (this.dpr > MIN_DPR) {
			this.dpr = Math.max(MIN_DPR, this.dpr * 0.75);
			this.applyDpr();
		}
	}

	private increaseQuality(): void {
		const nativeDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
		if (this.dpr < nativeDpr) {
			this.dpr = Math.min(nativeDpr, this.dpr * 1.1);
			this.applyDpr();
		}
	}

	private applyDpr(): void {
		const rect = this.canvas.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			this.resize(rect.width, rect.height);
		}
	}

	private handleContextLoss(event: Event): void {
		event.preventDefault();
		this.stopLoop();
	}

	private handleContextRestored(): void {
		this.gl = null;
		this.program = null;
		this.vertexShader = null;
		this.fragmentShader = null;
		this.quadBuffer = null;
		this.uniforms = {};

		this.init();
		this.startLoop();
	}

	destroy(): void {
		this.stopLoop();

		if (this.expressionDebounceTimer) {
			clearTimeout(this.expressionDebounceTimer);
		}

		this.canvas.removeEventListener("webglcontextlost", this.boundContextLost);
		this.canvas.removeEventListener("webglcontextrestored", this.boundContextRestored);

		const gl = this.gl;
		if (!gl) return;

		if (this.expressionProgram && this.shaderCompiler) {
			this.shaderCompiler.destroyProgram(this.expressionProgram);
			this.expressionProgram = null;
		}

		if (this.quadBuffer) {
			gl.deleteBuffer(this.quadBuffer);
		}
		if (this.program) {
			gl.deleteProgram(this.program);
		}
		if (this.vertexShader) {
			gl.deleteShader(this.vertexShader);
		}
		if (this.fragmentShader) {
			gl.deleteShader(this.fragmentShader);
		}

		this.gl = null;
		this.program = null;
		this.vertexShader = null;
		this.fragmentShader = null;
		this.quadBuffer = null;
		this.uniforms = {};
		this.shaderCompiler = null;
	}
}
