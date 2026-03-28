import { useStore } from "@tanstack/react-store";
import { useCallback, useMemo, useRef } from "react";
import { complexToPixel, pixelToComplex } from "@/lib/coordinates";
import { formatComplex } from "@/math/complex";
import { evaluateRational } from "@/math/evaluate-rational";
import { computeAllResidues } from "@/math/residue";
import {
	explorerStore,
	setCauchyCenter,
	setCauchyRadius,
	toggleCauchyShowImage,
} from "@/store/explorer-store";

const CONTOUR_COLOR = "oklch(0.65 0.18 145)";
const IMAGE_CURVE_COLOR = "oklch(0.7 0.15 140)";
const HANDLE_RADIUS = 6;
const HIT_RING_WIDTH = 12;
const IMAGE_SAMPLES = 200;
const IMAGE_PANEL_SIZE = 200;

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

/** Build SVG path and origin position from complex image points, fitting into a square panel. */
function buildImagePanelPath(
	imagePoints: { re: number; im: number }[],
	size: number,
): { path: string; originX: number; originY: number } {
	if (imagePoints.length === 0) {
		return { path: "", originX: size / 2, originY: size / 2 };
	}

	let minRe = Number.POSITIVE_INFINITY;
	let maxRe = Number.NEGATIVE_INFINITY;
	let minIm = Number.POSITIVE_INFINITY;
	let maxIm = Number.NEGATIVE_INFINITY;
	for (const pt of imagePoints) {
		if (pt.re < minRe) minRe = pt.re;
		if (pt.re > maxRe) maxRe = pt.re;
		if (pt.im < minIm) minIm = pt.im;
		if (pt.im > maxIm) maxIm = pt.im;
	}

	minRe = Math.min(minRe, 0);
	maxRe = Math.max(maxRe, 0);
	minIm = Math.min(minIm, 0);
	maxIm = Math.max(maxIm, 0);

	const padding = 0.15;
	const scale = (size * (1 - 2 * padding)) / Math.max(maxRe - minRe || 1, maxIm - minIm || 1);
	const offsetX = size / 2 - ((minRe + maxRe) / 2) * scale;
	const offsetY = size / 2 + ((minIm + maxIm) / 2) * scale;

	const toX = (re: number) => offsetX + re * scale;
	const toY = (im: number) => offsetY - im * scale;

	const parts = imagePoints.map(
		(pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.re).toFixed(1)},${toY(pt.im).toFixed(1)}`,
	);

	return { path: parts.join(" "), originX: toX(0), originY: toY(0) };
}

/** Compute winding number by counting signed angle traversal. */
function computeWindingNumber(imagePoints: { re: number; im: number }[]): number {
	let totalAngle = 0;
	for (let i = 1; i < imagePoints.length; i++) {
		const prev = imagePoints[i - 1];
		const curr = imagePoints[i];
		const angle1 = Math.atan2(prev.im, prev.re);
		const angle2 = Math.atan2(curr.im, curr.re);
		let delta = angle2 - angle1;
		// Unwrap to [-PI, PI]
		if (delta > Math.PI) delta -= 2 * Math.PI;
		if (delta < -Math.PI) delta += 2 * Math.PI;
		totalAngle += delta;
	}
	return Math.round(totalAngle / (2 * Math.PI));
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

	// Build image curve points (complex coordinates)
	const imagePoints = useMemo(() => {
		if (!cauchyShowImage) return [];
		const pts: { re: number; im: number }[] = [];
		for (let i = 0; i <= IMAGE_SAMPLES; i++) {
			const theta = (2 * Math.PI * i) / IMAGE_SAMPLES;
			const z = {
				re: cauchyCenter.re + cauchyRadius * Math.cos(theta),
				im: cauchyCenter.im + cauchyRadius * Math.sin(theta),
			};
			const fz = evaluateRational(z, poles, zeros, gain);
			if (!Number.isFinite(fz.re) || !Number.isFinite(fz.im)) continue;
			pts.push(fz);
		}
		return pts;
	}, [cauchyShowImage, cauchyCenter, cauchyRadius, poles, zeros, gain]);

	// Compute winding number from image curve
	const windingNumber = useMemo(() => {
		if (imagePoints.length < 3) return 0;
		return computeWindingNumber(imagePoints);
	}, [imagePoints]);

	// Build image curve SVG path for the popup panel (own coordinate system)
	const {
		path: imagePanelPath,
		originX: panelOriginX,
		originY: panelOriginY,
	} = useMemo(() => buildImagePanelPath(imagePoints, IMAGE_PANEL_SIZE), [imagePoints]);

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
	const absRadius = Math.abs(pixelRadius);

	return (
		<>
			<svg
				className="pointer-events-none absolute inset-0 z-20"
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label="Cauchy integral contour on the complex plane"
			>
				{/* Contour circle (visual) */}
				<circle
					cx={centerPixel.x}
					cy={centerPixel.y}
					r={absRadius}
					fill="none"
					stroke={CONTOUR_COLOR}
					strokeWidth={2}
					strokeDasharray="6 3"
					opacity={0.8}
				/>

				{/* Ring-shaped drag target — only the stroke band around the circle edge is interactive */}
				<circle
					cx={centerPixel.x}
					cy={centerPixel.y}
					r={absRadius}
					fill="none"
					stroke="transparent"
					strokeWidth={HIT_RING_WIDTH}
					style={{ pointerEvents: "stroke", cursor: "grab", touchAction: "none" }}
					onPointerDown={handleCenterPointerDown}
				/>

				{/* Center dot (small, interactive for precise center grabs) */}
				<circle
					cx={centerPixel.x}
					cy={centerPixel.y}
					r={8}
					fill="transparent"
					style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
					onPointerDown={handleCenterPointerDown}
				/>
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
					y={centerPixel.y - absRadius - 12}
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
					y={centerPixel.y - absRadius - 26}
					textAnchor="middle"
					fill={CONTOUR_COLOR}
					fontSize={11}
					fontFamily="monospace"
					style={{ pointerEvents: "none" }}
				>
					{"\u222E f(z)dz = "}
					{integralLabel}
				</text>
			</svg>

			{/* Image of Circle floating popup */}
			{cauchyShowImage && (
				<section
					className="absolute top-3 right-3 z-30 rounded-lg border border-border bg-[oklch(0.12_0.01_247)] shadow-xl"
					style={{ width: IMAGE_PANEL_SIZE + 16 }}
					aria-label="Image of contour circle"
				>
					<div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
						<span className="text-xs font-medium text-foreground">Image of Circle</span>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground text-xs px-1"
							onClick={toggleCauchyShowImage}
							aria-label="Close image of circle panel"
						>
							✕
						</button>
					</div>
					<div className="p-2">
						<svg
							width={IMAGE_PANEL_SIZE}
							height={IMAGE_PANEL_SIZE}
							viewBox={`0 0 ${IMAGE_PANEL_SIZE} ${IMAGE_PANEL_SIZE}`}
							className="rounded bg-[oklch(0.08_0.01_247)]"
							role="img"
							aria-label="Image curve of the contour under the function"
						>
							{/* Axes */}
							<line
								x1={0}
								y1={panelOriginY}
								x2={IMAGE_PANEL_SIZE}
								y2={panelOriginY}
								stroke="oklch(0.25 0 0)"
								strokeWidth={0.5}
							/>
							<line
								x1={panelOriginX}
								y1={0}
								x2={panelOriginX}
								y2={IMAGE_PANEL_SIZE}
								stroke="oklch(0.25 0 0)"
								strokeWidth={0.5}
							/>
							{/* Origin marker */}
							<circle
								cx={panelOriginX}
								cy={panelOriginY}
								r={3}
								fill="none"
								stroke="oklch(0.4 0 0)"
								strokeWidth={1}
							/>
							{/* Image curve */}
							{imagePanelPath && (
								<path
									d={imagePanelPath}
									fill="none"
									stroke={IMAGE_CURVE_COLOR}
									strokeWidth={1.5}
									opacity={0.9}
								/>
							)}
						</svg>
					</div>
					<div className="px-3 pb-2 text-[10px] space-y-0.5">
						<div className="text-muted-foreground">
							Winding number: <span className="font-mono text-foreground">{windingNumber}</span>
						</div>
						<div className="text-muted-foreground">
							{enclosedPoleIndices.length} pole{enclosedPoleIndices.length !== 1 ? "s" : ""} inside
							circle
						</div>
					</div>
				</section>
			)}
		</>
	);
}
