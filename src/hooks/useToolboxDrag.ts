import { useDrag } from "@use-gesture/react";
import { useCallback, useRef } from "react";
import { pixelToComplex } from "@/lib/coordinates";
import { addPole, addZero } from "@/store/explorer-store";

type SingularityType = "pole" | "zero";

const PREVIEW_SIZE = 24;

function createPreviewElement(type: SingularityType): HTMLElement {
	const element = document.createElement("div");
	element.style.position = "fixed";
	element.style.pointerEvents = "none";
	element.style.zIndex = "9999";
	element.style.width = `${PREVIEW_SIZE}px`;
	element.style.height = `${PREVIEW_SIZE}px`;
	element.style.display = "flex";
	element.style.alignItems = "center";
	element.style.justifyContent = "center";
	element.style.fontSize = "18px";
	element.style.fontWeight = "bold";
	element.style.color = type === "pole" ? "oklch(0.65 0.18 25)" : "oklch(0.65 0.15 195)";

	element.textContent = type === "pole" ? "\u00d7" : "\u25cb";
	return element;
}

function canvasPixelToComplex(
	pixelX: number,
	pixelY: number,
	canvasRect: DOMRect,
): { re: number; im: number } | null {
	const localX = pixelX - canvasRect.left;
	const localY = pixelY - canvasRect.top;

	const isInBounds =
		localX >= 0 && localX <= canvasRect.width && localY >= 0 && localY <= canvasRect.height;
	if (!isInBounds) return null;

	return pixelToComplex(localX, localY, canvasRect.width, canvasRect.height);
}

function placeSingularity(
	type: SingularityType,
	clientX: number,
	clientY: number,
	canvasSelector: string,
): void {
	const canvas = document.querySelector(canvasSelector);
	if (!canvas) return;

	const rect = canvas.getBoundingClientRect();
	const complex = canvasPixelToComplex(clientX, clientY, rect);
	if (!complex) return;

	const dispatch = type === "pole" ? addPole : addZero;
	dispatch(complex.re, complex.im);
}

export function useToolboxDrag(type: SingularityType, canvasSelector = "canvas") {
	const previewRef = useRef<HTMLElement | null>(null);

	const cleanupPreview = useCallback(() => {
		if (previewRef.current) {
			previewRef.current.remove();
			previewRef.current = null;
		}
	}, []);

	const bind = useDrag(
		({ first, last, xy: [clientX, clientY] }) => {
			if (first) {
				const preview = createPreviewElement(type);
				document.body.appendChild(preview);
				previewRef.current = preview;
			}

			if (previewRef.current) {
				previewRef.current.style.left = `${clientX - PREVIEW_SIZE / 2}px`;
				previewRef.current.style.top = `${clientY - PREVIEW_SIZE / 2}px`;
			}

			if (last) {
				cleanupPreview();
				placeSingularity(type, clientX, clientY, canvasSelector);
			}
		},
		{ pointer: { capture: false } },
	);

	return bind;
}
