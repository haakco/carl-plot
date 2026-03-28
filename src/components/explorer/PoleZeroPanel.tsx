import { useStore } from "@tanstack/react-store";
import { ChevronDown, ChevronUp, Circle, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
	getStabilityColor,
	moveWithConjugate,
	parseCoordinate,
	snapToGrid,
} from "@/lib/singularity-helpers";
import type { Complex } from "@/math/complex";
import { formatComplex } from "@/math/complex";
import {
	addPole,
	addZero,
	explorerStore,
	removeSingularity,
	setSelectedId,
} from "@/store/explorer-store";

const MINIMAP_SIZE = 160;
const MINIMAP_RANGE = 4; // shows -4 to +4 on each axis

function toMinimap(re: number, im: number): { x: number; y: number } {
	const x = ((re + MINIMAP_RANGE) / (2 * MINIMAP_RANGE)) * MINIMAP_SIZE;
	const y = ((MINIMAP_RANGE - im) / (2 * MINIMAP_RANGE)) * MINIMAP_SIZE;
	return { x, y };
}

function fromMinimap(px: number, py: number): { re: number; im: number } {
	const re = (px / MINIMAP_SIZE) * 2 * MINIMAP_RANGE - MINIMAP_RANGE;
	const im = MINIMAP_RANGE - (py / MINIMAP_SIZE) * 2 * MINIMAP_RANGE;
	return { re, im };
}

function MiniMap() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const selectedId = useStore(explorerStore, (s) => s.selectedId);
	const isDraggingRef = useRef(false);
	const draggingIdRef = useRef<string | null>(null);

	const handlePointerDown = useCallback((e: React.PointerEvent, itemId: string) => {
		e.stopPropagation();
		e.preventDefault();
		isDraggingRef.current = true;
		draggingIdRef.current = itemId;
		setSelectedId(itemId);

		const svg = (e.target as SVGElement).ownerSVGElement;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();

		const onMove = (me: PointerEvent) => {
			if (!isDraggingRef.current || !draggingIdRef.current) return;
			const px = me.clientX - rect.left;
			const py = me.clientY - rect.top;
			const position = fromMinimap(px, py);
			if (draggingIdRef.current) {
				moveWithConjugate(draggingIdRef.current, position);
			}
		};

		const onUp = (ue: PointerEvent) => {
			isDraggingRef.current = false;
			const px = ue.clientX - rect.left;
			const py = ue.clientY - rect.top;
			const { re, im } = fromMinimap(px, py);
			const snapped = {
				re: snapToGrid(re),
				im: snapToGrid(im),
			};
			if (draggingIdRef.current) {
				moveWithConjugate(draggingIdRef.current, snapped);
			}
			draggingIdRef.current = null;
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}, []);

	const allItems = [...poles, ...zeros];

	return (
		<svg
			width={MINIMAP_SIZE}
			height={MINIMAP_SIZE}
			viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`}
			className="rounded border border-border bg-background/80"
			role="img"
			aria-label="Pole and zero mini-map"
		>
			{/* Grid lines */}
			{[-3, -2, -1, 0, 1, 2, 3].map((v) => {
				const { x } = toMinimap(v, 0);
				const { y } = toMinimap(0, v);
				return (
					<g key={v}>
						<line
							x1={x}
							y1={0}
							x2={x}
							y2={MINIMAP_SIZE}
							stroke="currentColor"
							strokeWidth={v === 0 ? 0.8 : 0.3}
							className="text-muted-foreground"
							opacity={v === 0 ? 0.6 : 0.3}
						/>
						<line
							x1={0}
							y1={y}
							x2={MINIMAP_SIZE}
							y2={y}
							stroke="currentColor"
							strokeWidth={v === 0 ? 0.8 : 0.3}
							className="text-muted-foreground"
							opacity={v === 0 ? 0.6 : 0.3}
						/>
					</g>
				);
			})}

			{/* Unit circle */}
			{(() => {
				const center = toMinimap(0, 0);
				const edge = toMinimap(1, 0);
				const r = edge.x - center.x;
				return (
					<circle
						cx={center.x}
						cy={center.y}
						r={r}
						fill="none"
						stroke="currentColor"
						strokeWidth={0.5}
						className="text-muted-foreground"
						opacity={0.4}
						strokeDasharray="3 2"
					/>
				);
			})()}

			{/* Markers */}
			{allItems.map((item) => {
				const { x, y } = toMinimap(item.re, item.im);
				const isSelected = item.id === selectedId;
				const color = item.type === "pole" ? "oklch(0.65 0.18 25)" : "oklch(0.65 0.15 195)";
				const size = isSelected ? 6 : 4;

				return (
					<g
						key={item.id}
						style={{ cursor: "grab", touchAction: "none" }}
						onPointerDown={(e) => handlePointerDown(e, item.id)}
					>
						{/* Hit target */}
						<circle cx={x} cy={y} r={14} fill="transparent" />

						{isSelected && (
							<circle
								cx={x}
								cy={y}
								r={size + 3}
								fill="none"
								stroke={color}
								strokeWidth={1}
								opacity={0.4}
							/>
						)}

						{/* Stability glow ring for poles (Z-transform: unit circle stability) */}
						{item.type === "pole" && (
							<circle
								cx={x}
								cy={y}
								r={size + 6}
								fill="none"
								stroke={getStabilityColor(item.re, item.im)}
								strokeWidth={1.5}
								opacity={0.3}
								strokeDasharray="3 1.5"
							/>
						)}

						{item.type === "pole" ? (
							<>
								<line
									x1={x - size}
									y1={y - size}
									x2={x + size}
									y2={y + size}
									stroke={color}
									strokeWidth={1.5}
									strokeLinecap="round"
								/>
								<line
									x1={x + size}
									y1={y - size}
									x2={x - size}
									y2={y + size}
									stroke={color}
									strokeWidth={1.5}
									strokeLinecap="round"
								/>
							</>
						) : (
							<circle cx={x} cy={y} r={size} fill="none" stroke={color} strokeWidth={1.5} />
						)}
					</g>
				);
			})}
		</svg>
	);
}

function CoordRow({ item }: { item: Complex }) {
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const startEditing = useCallback(() => {
		setEditValue(formatComplex(item));
		setEditing(true);
		setTimeout(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		}, 0);
	}, [item]);

	const commitEdit = useCallback(() => {
		const parsed = parseCoordinate(editValue);
		if (parsed) {
			moveWithConjugate(item.id, parsed);
		}
		setEditing(false);
	}, [editValue, item.id]);

	const isPole = item.type === "pole";
	const color = isPole ? "text-pole" : "text-zero";

	return (
		<div className="flex items-center gap-1">
			{isPole ? (
				<X className={`size-3 shrink-0 ${color}`} strokeWidth={2.5} />
			) : (
				<Circle className={`size-3 shrink-0 ${color}`} strokeWidth={2.5} />
			)}

			{editing ? (
				<input
					ref={inputRef}
					type="text"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={commitEdit}
					onKeyDown={(e) => {
						if (e.key === "Enter") commitEdit();
						if (e.key === "Escape") setEditing(false);
					}}
					className="min-w-0 flex-1 rounded-sm border border-ring bg-background px-1 font-mono text-[11px] tabular-nums text-foreground outline-none"
				/>
			) : (
				<button
					type="button"
					onDoubleClick={startEditing}
					onClick={() => setSelectedId(item.id)}
					className="min-w-0 flex-1 cursor-pointer truncate text-left font-mono text-[11px] tabular-nums text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
					aria-label={`${item.type === "pole" ? "Pole" : "Zero"} at ${formatComplex(item)}, double-click to edit`}
				>
					{formatComplex(item)}
				</button>
			)}

			<button
				type="button"
				onClick={() => removeSingularity(item.id)}
				className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={`Remove ${item.type}`}
			>
				<X className="size-2.5" />
			</button>
		</div>
	);
}

export function PoleZeroPanel() {
	const [collapsed, setCollapsed] = useState(false);
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const allItems = [...poles, ...zeros];

	return (
		<div className="absolute right-2 top-2 z-20 flex flex-col gap-1 rounded-md border border-border bg-background/90 shadow-lg backdrop-blur-sm">
			<button
				type="button"
				onClick={() => setCollapsed((c) => !c)}
				aria-expanded={!collapsed}
				className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span className="flex-1 text-left">Poles & Zeros</span>
				{collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
			</button>

			{!collapsed && (
				<div className="flex flex-col gap-2 px-2 pb-2">
					<MiniMap />

					{allItems.length > 0 && (
						<div className="flex flex-col gap-0.5">
							{allItems.map((item) => (
								<CoordRow key={item.id} item={item} />
							))}
						</div>
					)}

					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => addPole(0, 0)}
							aria-label="Add pole at origin"
							className="flex flex-1 items-center justify-center gap-1 rounded-sm bg-pole-bg px-1 py-0.5 text-[10px] font-medium text-foreground hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
						>
							<X className="size-2.5 text-pole" strokeWidth={2.5} aria-hidden="true" />
							Pole
						</button>
						<button
							type="button"
							onClick={() => addZero(0, 0)}
							aria-label="Add zero at origin"
							className="flex flex-1 items-center justify-center gap-1 rounded-sm bg-zero-bg px-1 py-0.5 text-[10px] font-medium text-foreground hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Circle className="size-2.5 text-zero" strokeWidth={2.5} aria-hidden="true" />
							Zero
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
