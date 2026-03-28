import { useDrag } from "@use-gesture/react";
import { useCallback, useRef } from "react";
import { complexToPixel, pixelToComplex } from "@/lib/coordinates";
import { moveWithConjugate, snapToGrid } from "@/lib/singularity-helpers";
import type { Complex } from "@/math/complex";
import { explorerStore, setSelectedId } from "@/store/explorer-store";

const HIT_RADIUS_PX = 20;

function findNearestSingularity(
	pixelX: number,
	pixelY: number,
	width: number,
	height: number,
): Complex | null {
	const state = explorerStore.state;
	const allItems = [...state.poles, ...state.zeros];

	let nearest: Complex | null = null;
	let nearestDist = HIT_RADIUS_PX;

	for (const item of allItems) {
		const pixel = complexToPixel(item, width, height);
		const dx = pixel.x - pixelX;
		const dy = pixel.y - pixelY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < nearestDist) {
			nearest = item;
			nearestDist = dist;
		}
	}

	return nearest;
}

interface UsePoleZeroDragOptions {
	canvasWidth: number;
	canvasHeight: number;
	snap?: boolean;
}

export function usePoleZeroDrag({
	canvasWidth,
	canvasHeight,
	snap = true,
}: UsePoleZeroDragOptions) {
	const draggedIdRef = useRef<string | null>(null);

	const onDragStart = useCallback(
		(localX: number, localY: number) => {
			const item = findNearestSingularity(localX, localY, canvasWidth, canvasHeight);
			if (item) {
				draggedIdRef.current = item.id;
				setSelectedId(item.id);
			} else {
				draggedIdRef.current = null;
			}
		},
		[canvasWidth, canvasHeight],
	);

	const bind = useDrag(
		({ first, last, xy: [clientX, clientY], event }) => {
			const target = event?.currentTarget;
			if (!target || !(target instanceof Element)) return;

			const rect = target.getBoundingClientRect();
			const localX = clientX - rect.left;
			const localY = clientY - rect.top;

			if (first) {
				onDragStart(localX, localY);
			}

			const draggedId = draggedIdRef.current;
			if (!draggedId) return;

			const complex = pixelToComplex(localX, localY, canvasWidth, canvasHeight);
			const position =
				last && snap ? { re: snapToGrid(complex.re), im: snapToGrid(complex.im) } : complex;

			moveWithConjugate(draggedId, position);

			if (last) {
				draggedIdRef.current = null;
			}
		},
		{ pointer: { capture: false } },
	);

	return bind;
}
