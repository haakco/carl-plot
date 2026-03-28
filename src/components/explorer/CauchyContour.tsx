import { useStore } from "@tanstack/react-store";
import { useCallback, useMemo, useRef } from "react";
import { complexToPixel, pixelToComplex } from "@/lib/coordinates";
import { formatComplex } from "@/math/complex";
import { evaluateRational } from "@/math/evaluate-rational";
import { computeAllResidues } from "@/math/residue";
import { explorerStore, setCauchyCenter, setCauchyRadius } from "@/store/explorer-store";

const CONTOUR_COLOR = "oklch(0.65 0.18 145)";
const IMAGE_CURVE_COLOR = "oklch(0.7 0.15 140)";
const HANDLE_RADIUS = 6;
const IMAGE_SAMPLES = 200;

interface CauchyContourProps {
	width: number;
	height: number;
}

/** Compute distance between two complex numbers. */
function complexDist(a: { re: number; im: number }, b: { re: number; im: number }): number {
	const dr = a.re - b.re;
	const di = a.im - b.im;
	return Math.sqrt(dr * dr + di * di);
}

export function CauchyContour({ width, height }: CauchyContourProps) {
	const cauchyContour = useStore(explorerStore, (s) => s.cauchyContour);
	const cauchyCenter = useStore(explorerStore, (s) => s.cauchyCenter);
	const cauchyRadius = useStore(explorerStore, (s) => s.cauchyRadius);
	const cauchyShowImage = useStore(explorerStore, (s) => s.cauchyShowImage);
	const mode = useStore(explorerStore, (s) => s.mode);
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

	const residueMap = useMemo(() => computeAllResidues(poles, zeros, gain), [poles, zeros, gain]);

	// Compute the integral (2*pi*i * sum of residues)
	const integralLabel = useMemo(() => {
		if (enclosedPoleIndices.length === 0) {
			return "0";
		}

		let sumResidues: { re: number; im: number } = { re: 0, im: 0 };
		for (const idx of enclosedPoleIndices) {
			const res = residueMap.get(poles[idx].id);
			if (!res || res.order > 1) {
				return "unavailable (repeated poles)";
			}
			sumResidues = { re: sumResidues.re + res.re, im: sumResidues.im + res.im };
		}

		const integral = {
			re: -2 * Math.PI * sumResidues.im,
			im: 2 * Math.PI * sumResidues.re,
		};
		return formatComplex({ id: "cauchy-integral", type: "zero", ...integral });
	}, [enclosedPoleIndices, poles, residueMap]);

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
			const fz = evaluateRational(z, poles, zeros, gain);
			if (!Number.isFinite(fz.re) || !Number.isFinite(fz.im)) continue;
			const pixel = complexToPixel(fz, width, height);
			points.push(`${i === 0 ? "M" : "L"}${pixel.x},${pixel.y}`);
		}
		return points.join(" ");
	}, [cauchyShowImage, cauchyCenter, cauchyRadius, poles, zeros, gain, width, height]);

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

	if (!cauchyContour || mode !== "poles-zeros") return null;

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
				{integralLabel}
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
