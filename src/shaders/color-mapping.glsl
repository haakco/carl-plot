// Color mapping utilities for domain coloring

// Compact branchless HSV to RGB (Shadertoy convention)
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Domain coloring: map complex value w = f(z) to RGB
// contourDensity: scales logarithmic modulus contour frequency
// showModContours: enable rings at logarithmically-spaced |f| intervals
// showPhaseContours: enable isochromatic phase lines
// showGrid: overlay integer-valued Re(f) and Im(f) grid lines
vec3 domainColor(vec2 w, float contourDensity, bool showModContours, bool showPhaseContours, bool showGrid) {
    float arg = atan(w.y, w.x);            // Phase: (-pi, pi]
    float mag = length(w);                   // Modulus

    // Base coloring
    float hue = arg / (2.0 * 3.14159265) + 0.5;   // Map (-pi,pi] to [0,1]
    float lightness = (2.0 / 3.14159265) * atan(mag);  // Smooth [0,inf) -> [0,1)
    float saturation = 0.85;

    // Enhanced contours
    float modContour = 1.0;
    float phaseContour = 1.0;
    float gridLine = 1.0;

    if (showModContours) {
        float logMag = log2(max(mag, 1e-10));
        modContour = 0.7 + 0.3 * (0.5 + 0.5 * cos(2.0 * 3.14159265 * logMag * contourDensity));
    }

    if (showPhaseContours) {
        float phaseLines = 0.5 + 0.5 * cos(6.0 * arg);  // 6 phase lines
        phaseContour = 0.7 + 0.3 * phaseLines;
    }

    if (showGrid) {
        float gx = 1.0 - smoothstep(0.0, 0.05, abs(fract(w.x + 0.5) - 0.5));
        float gy = 1.0 - smoothstep(0.0, 0.05, abs(fract(w.y + 0.5) - 0.5));
        gridLine = 1.0 - 0.3 * max(gx, gy);
    }

    lightness *= modContour * phaseContour * gridLine;

    return hsv2rgb(vec3(hue, saturation, lightness));
}
