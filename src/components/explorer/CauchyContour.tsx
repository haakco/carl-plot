import { useStore } from "@tanstack/react-store";
import { useCallback, useMemo, useRef } from "react";
import { complexToPixel, pixelToComplex } from "@/lib/coordinates";
import { explorerStore, setCauchyCenter, setCauchyRadius } from "@/store/explorer-store";

const CONTOUR_COLOR = "oklch(0.65 0.18 145)";
const IMAGE_CURVE_COLOR = "oklch(0.7 0.15 140)";
const HANDLE_RADIUS = 6;
const IMAGE_SAMPLES = 200;

interface CauchyContourProps {
	width: number;
	height: number;
}

interface Residue {
	re: number;
	im: number;
}

/** Compute distance between two complex numbers. */
function complexDist(a: { re: number; im: number }, b: { re: number; im: number }): number {
	const dr = a.re - b.re;
	const di = a.im - b.im;
	return Math.sqrt(dr * dr + di * di);
}

/** Multiply two complex numbers. */
function cMul(
	a: { re: number; im: number },
	b: { re: number; im: number },
): { re: number; im: number } {
	return {
		re: a.re * b.re - a.im * b.im,
		im: a.re * b.im + a.im * b.re,
	};
}

/** Divide two complex numbers. */
function cDiv(
	a: { re: number; im: number },
	b: { re: number; im: number },
): { re: number; im: number } {
	const denom = b.re * b.re + b.im * b.im;
	if (denom === 0) return { re: Number.NaN, im: Number.NaN };
	return {
		re: (a.re * b.re + a.im * b.im) / denom,
		im: (a.im * b.re - a.re * b.im) / denom,
	};
}

/** Subtract two complex numbers. */
function cSub(
	a: { re: number; im: number },
	b: { re: number; im: number },
): { re: number; im: number } {
	return { re: a.re - b.re, im: a.im - b.im };
}

/**
 * Evaluate f(z) = gain * prod(z - zeros) / prod(z - poles)
 */
function evaluateF(
	z: { re: number; im: number },
	zeros: { re: number; im: number }[],
	poles: { re: number; im: number }[],
	gain: number,
): { re: number; im: number } {
	let num: { re: number; im: number } = { re: gain, im: 0 };
	for (const zero of zeros) {
		num = cMul(num, cSub(z, zero));
	}
	let den: { re: number; im: number } = { re: 1, im: 0 };
	for (const pole of poles) {
		den = cMul(den, cSub(z, pole));
	}
	return cDiv(num, den);
}

/**
 * Compute residue at a simple pole p for f(z) = gain * prod(z-zeros) / prod(z-poles).
 * Residue = gain * prod(p - zeros) / prod'(p - otherPoles)
 */
function computeResidue(
	poleIndex: number,
	poles: { re: number; im: number }[],
	zeros: { re: number; im: number }[],
	gain: number,
): Residue {
	const p = poles[poleIndex];
	let num: { re: number; im: number } = { re: gain, im: 0 };
	for (const zero of zeros) {
		num = cMul(num, cSub(p, zero));
	}
	let den: { re: number; im: number } = { re: 1, im: 0 };
	for (let i = 0; i < poles.length; i++) {
		if (i === poleIndex) continue;
		den = cMul(den, cSub(p, poles[i]));
	}
	return cDiv(num, den);
}

/** Format a complex number for display. */
function formatComplex(z: { re: number; im: number }): string {
	const re = Math.round(z.re * 1000) / 1000;
	const im = Math.round(z.im * 1000) / 1000;
	if (im === 0) return `${re}`;
	const sign = im > 0 ? "+" : "-";
	return `${re} ${sign} ${Math.abs(im)}i`;
}

export function CauchyContour({ width, height }: CauchyContourProps) {
	const cauchyContour = useStore(explorerStore, (s) => s.cauchyContour);
	const cauchyCenter = useStore(explorerStore, (s) => s.cauchyCenter);
	const cauchyRadius = useStore(explorerStore, (s) => s.cauchyRadius);
	const cauchyShowImage = useStore(explorerStore, (s) => s.cauchyShowImage);
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	const isDraggingCenterRef = useRef(false);
	const isDraggingHandleRef = useRef(false);

	const centerPixel = complexToPixel(cauchyCenter, width, height);
	const edgePixel = complexToPixel(
		{ re: cauchyCenter.re + cauchyRadius, im: cauchyCenter.im },
		width,
		height,
	);
	const pixelRadius = edgePixel.x - centerPixel.x;

	// Find poles enclosed by the contour
	const enclosedPoleIndices = useMemo(() => {
		const indices: number[] = [];
		for (let i = 0; i < poles.length; i++) {
			if (complexDist(poles[i], cauchyCenter) < cauchyRadius) {
				indices.push(i);
			}
		}
		return indices;
	}, [poles, cauchyCenter, cauchyRadius]);

	// Compute the integral (2*pi*i * sum of residues)
	const integralResult = useMemo(() => {
		if (enclosedPoleIndices.length === 0) {
			return { re: 0, im: 0 };
		}
		let sumResidues: { re: number; im: number } = { re: 0, im: 0 };
		for (const idx of enclosedPoleIndices) {
			const res = computeResidue(idx, poles, zeros, gain);
			sumResidues = { re: sumResidues.re + res.re, im: sumResidues.im + res.im };
		}
		// Multiply by 2*pi*i: (a + bi) * 2*pi*i = -2*pi*b + 2*pi*a*i
		return {
			re: -2 * Math.PI * sumResidues.im,
			im: 2 * Math.PI * sumResidues.re,
		};
	}, [enclosedPoleIndices, poles, zeros, gain]);

	// Build image curve path
	const imageCurvePath = useMemo(() => {
		if (!cauchyShowImage) return "";
		const points: string[] = [];
		for (let i = 0; i <= IMAGE_SAMPLES; i++) {
			const theta = (2 * Math.PI * i) / IMAGE_SAMPLES;
			const z = {
				re: cauchyCenter.re + cauchyRadius * Math.cos(theta),
				im: cauchyCenter.im + cauchyRadius * Math.sin(theta),
			};
			const fz = evaluateF(z, zeros, poles, gain);
			if (Number.isNaN(fz.re) || Number.isNaN(fz.im)) continue;
			if (!Number.isFinite(fz.re) || !Number.isFinite(fz.im)) continue;
			const pixel = complexToPixel(fz, width, height);
			points.push(`${i === 0 ? "M" : "L"}${pixel.x},${pixel.y}`);
		}
		return points.join(" ");
	}, [cauchyShowImage, cauchyCenter, cauchyRadius, zeros, poles, gain, width, height]);

	// --- Drag handlers ---

	const handleCenterPointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			isDraggingCenterRef.current = true;

			const svg = (e.target as SVGElement).ownerSVGElement;
			if (!svg) return;
			const svgRect = svg.getBoundingClientRect();

			const onPointerMove = (moveEvent: PointerEvent) => {
				if (!isDraggingCenterRef.current) return;
				const localX = moveEvent.clientX - svgRect.left;
				const localY = moveEvent.clientY - svgRect.top;
				const complex = pixelToComplex(localX, localY, width, height);
				setCauchyCenter(complex.re, complex.im);
			};

			const onPointerUp = () => {
				isDraggingCenterRef.current = false;
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", onPointerUp);
			};

			window.addEventListener("pointermove", onPointerMove);
			window.addEventListener("pointerup", onPointerUp);
		},
		[width, height],
	);

	const handleRadiusPointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();

			isDraggingHandleRef.current = true;

			const svg = (e.target as SVGElement).ownerSVGElement;
			if (!svg) return;
			const svgRect = svg.getBoundingClientRect();

			const onPointerMove = (moveEvent: PointerEvent) => {
				if (!isDraggingHandleRef.current) return;
				const localX = moveEvent.clientX - svgRect.left;
				const localY = moveEvent.clientY - svgRect.top;
				const complex = pixelToComplex(localX, localY, width, height);
				const dist = complexDist(complex, explorerStore.state.cauchyCenter);
				setCauchyRadius(dist);
			};

			const onPointerUp = () => {
				isDraggingHandleRef.current = false;
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", onPointerUp);
			};

			window.addEventListener("pointermove", onPointerMove);
			window.addEventListener("pointerup", onPointerUp);
		},
		[width, height],
	);

	if (!cauchyContour) return null;

	const handleX = centerPixel.x + pixelRadius;
	const handleY = centerPixel.y;

	return (
		<svg
			className="pointer-events-none absolute inset-0 z-20"
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label="Cauchy integral contour on the complex plane"
		>
			{/* Contour circle */}
			<circle
				cx={centerPixel.x}
				cy={centerPixel.y}
				r={Math.abs(pixelRadius)}
				fill="none"
				stroke={CONTOUR_COLOR}
				strokeWidth={2}
				strokeDasharray="6 3"
				opacity={0.8}
			/>

			{/* Draggable center area */}
			<circle
				cx={centerPixel.x}
				cy={centerPixel.y}
				r={Math.max(Math.abs(pixelRadius) - 4, 8)}
				fill="transparent"
				style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
				onPointerDown={handleCenterPointerDown}
			/>

			{/* Center dot */}
			<circle
				cx={centerPixel.x}
				cy={centerPixel.y}
				r={3}
				fill={CONTOUR_COLOR}
				style={{ pointerEvents: "none" }}
			/>

			{/* Radius handle */}
			<circle
				cx={handleX}
				cy={handleY}
				r={HANDLE_RADIUS}
				fill={CONTOUR_COLOR}
				stroke="white"
				strokeWidth={1.5}
				style={{ pointerEvents: "auto", cursor: "ew-resize", touchAction: "none" }}
				onPointerDown={handleRadiusPointerDown}
			/>

			{/* Enclosed poles count */}
			<text
				x={centerPixel.x}
				y={centerPixel.y - Math.abs(pixelRadius) - 12}
				textAnchor="middle"
				fill={CONTOUR_COLOR}
				fontSize={12}
				fontFamily="monospace"
				style={{ pointerEvents: "none" }}
			>
				{enclosedPoleIndices.length} pole
				{enclosedPoleIndices.length !== 1 ? "s" : ""} enclosed
			</text>

			{/* Integral value */}
			<text
				x={centerPixel.x}
				y={centerPixel.y - Math.abs(pixelRadius) - 26}
				textAnchor="middle"
				fill={CONTOUR_COLOR}
				fontSize={11}
				fontFamily="monospace"
				style={{ pointerEvents: "none" }}
			>
				{"\u222E f(z)dz = "}
				{formatComplex(integralResult)}
			</text>

			{/* Image curve */}
			{cauchyShowImage && imageCurvePath && (
				<path
					d={imageCurvePath}
					fill="none"
					stroke={IMAGE_CURVE_COLOR}
					strokeWidth={1.5}
					opacity={0.8}
					style={{ pointerEvents: "none" }}
				/>
			)}
		</svg>
	);
}
