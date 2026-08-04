/**
 * WebGL2 utility functions for shader compilation, program linking,
 * uniform location retrieval, and fullscreen quad setup.
 */

export function createShader(
	gl: WebGL2RenderingContext,
	type: GLenum,
	source: string,
): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error("Failed to create shader object");
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const infoLog = gl.getShaderInfoLog(shader) ?? "Unknown error";
		gl.deleteShader(shader);
		throw new Error(`Shader compilation failed: ${infoLog}`);
	}

	return shader;
}

export function createProgram(
	gl: WebGL2RenderingContext,
	vertexShader: WebGLShader,
	fragmentShader: WebGLShader,
): WebGLProgram {
	const program = gl.createProgram();
	if (!program) {
		throw new Error("Failed to create program object");
	}

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const infoLog = gl.getProgramInfoLog(program) ?? "Unknown error";
		gl.deleteProgram(program);
		throw new Error(`Program linking failed: ${infoLog}`);
	}

	return program;
}

export function getUniformLocations(
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	names: string[],
): Record<string, WebGLUniformLocation | null> {
	const locations: Record<string, WebGLUniformLocation | null> = {};
	for (const name of names) {
		locations[name] = gl.getUniformLocation(program, name);
	}
	return locations;
}

export function setupFullscreenQuad(gl: WebGL2RenderingContext): WebGLBuffer {
	const buffer = gl.createBuffer();
	if (!buffer) {
		throw new Error("Failed to create vertex buffer");
	}

	const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	return buffer;
}
