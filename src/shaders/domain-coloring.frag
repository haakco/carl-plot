#version 300 es
precision highp float;

#define MAX_SINGULARITIES 32

uniform vec2 u_resolution;
uniform vec2 u_center;       // Pan offset (complex plane center)
uniform float u_zoom;         // Zoom level
uniform int u_numPoles;
uniform int u_numZeros;
uniform vec2 u_poles[MAX_SINGULARITIES];
uniform vec2 u_zeros[MAX_SINGULARITIES];
uniform float u_gain;         // K multiplier
uniform float u_contourDensity;
uniform bool u_showModContours;
uniform bool u_showPhaseContours;
uniform bool u_showGrid;

out vec4 fragColor;

#include "complex-math.glsl"
#include "color-mapping.glsl"

vec2 evaluateFunction(vec2 z) {
    vec2 numerator = vec2(u_gain, 0.0);
    vec2 denominator = vec2(1.0, 0.0);

    for (int i = 0; i < MAX_SINGULARITIES; i++) {
        if (i >= u_numZeros) break;
        numerator = cmul(numerator, z - u_zeros[i]);
    }

    for (int i = 0; i < MAX_SINGULARITIES; i++) {
        if (i >= u_numPoles) break;
        denominator = cmul(denominator, z - u_poles[i]);
    }

    return cdiv(numerator, denominator);
}

void main() {
    // Map pixel to complex plane coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 z = uv / u_zoom + u_center;

    // Evaluate and color
    vec2 w = evaluateFunction(z);
    vec3 color = domainColor(w, u_contourDensity, u_showModContours, u_showPhaseContours, u_showGrid);

    // Draw axes
    float axisWidth = 1.5 / min(u_resolution.x, u_resolution.y) / u_zoom;
    float xAxis = smoothstep(axisWidth, 0.0, abs(z.y));
    float yAxis = smoothstep(axisWidth, 0.0, abs(z.x));
    color = mix(color, vec3(0.5), max(xAxis, yAxis) * 0.3);

    // Draw unit circle
    float unitCircle = smoothstep(axisWidth, 0.0, abs(length(z) - 1.0));
    color = mix(color, vec3(0.6), unitCircle * 0.2);

    fragColor = vec4(color, 1.0);
}
