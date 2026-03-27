// Complex arithmetic library
// Convention: vec2 represents a complex number (.x = real, .y = imaginary)

// Multiplication: (a+bi)(c+di) = (ac-bd) + (ad+bc)i
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

// Division: (a+bi)/(c+di)
vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2(dot(a, b), a.y*b.x - a.x*b.y) / max(d, 1e-10);
}

// Power (real exponent): z^n via polar form
vec2 cpow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(n * theta), sin(n * theta));
}

// Logarithm (principal branch, cut on negative real axis)
vec2 clog(vec2 z) {
    return vec2(log(length(z)), atan(z.y, z.x));
}

// Exponential: e^(a+bi) = e^a(cos(b) + i*sin(b))
// Clamp real part to prevent float overflow (e^88 ~ 1.65e38, near float max)
vec2 cexp(vec2 z) {
    float clamped = min(z.x, 88.0);
    return exp(clamped) * vec2(cos(z.y), sin(z.y));
}

// Complex sine: sin(a+bi) = sin(a)cosh(b) + i*cos(a)sinh(b)
vec2 csin(vec2 z) {
    return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
}

// Complex cosine: cos(a+bi) = cos(a)cosh(b) - i*sin(a)sinh(b)
vec2 ccos(vec2 z) {
    return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y));
}
