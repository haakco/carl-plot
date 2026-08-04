#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_contourDensity;
uniform bool u_showModContours;
uniform bool u_showPhaseContours;
uniform bool u_showGrid;

out vec4 fragColor;

#include "complex-math.glsl"
#include "color-mapping.glsl"

vec2 evaluateFunction(vec2 z) {
    return z;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 z = uv / u_zoom + u_center;

    vec2 w = evaluateFunction(z);
    vec3 color = domainColor(w, u_contourDensity, u_showModContours, u_showPhaseContours, u_showGrid);

    float axisWidth = 1.5 / min(u_resolution.x, u_resolution.y) / u_zoom;
    float xAxis = smoothstep(axisWidth, 0.0, abs(z.y));
    float yAxis = smoothstep(axisWidth, 0.0, abs(z.x));
    color = mix(color, vec3(0.5), max(xAxis, yAxis) * 0.3);

    float unitCircle = smoothstep(axisWidth, 0.0, abs(length(z) - 1.0));
    color = mix(color, vec3(0.6), unitCircle * 0.2);

    fragColor = vec4(color, 1.0);
}
