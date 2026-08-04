import { useCallback, useRef, useState } from "react";

/**
 * Makes a panel draggable by its title bar.
 * Returns an offset (dx, dy) to apply as CSS transform,
 * so the panel's initial position is still set via normal CSS.
 */
export function useDraggablePanel() {
	const [offset, setOffset] = useState({ dx: 0, dy: 0 });
	const isDraggingRef = useRef(false);

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			isDraggingRef.current = true;

			const startMouseX = e.clientX;
			const startMouseY = e.clientY;
			const startDx = offset.dx;
			const startDy = offset.dy;

			const onPointerMove = (moveEvent: PointerEvent) => {
				if (!isDraggingRef.current) return;
				setOffset({
					dx: startDx + moveEvent.clientX - startMouseX,
					dy: startDy + moveEvent.clientY - startMouseY,
				});
			};

			const onPointerUp = () => {
				isDraggingRef.current = false;
				window.removeEventListener("pointermove", onPointerMove);
				window.removeEventListener("pointerup", onPointerUp);
			};

			window.addEventListener("pointermove", onPointerMove);
			window.addEventListener("pointerup", onPointerUp);
		},
		[offset.dx, offset.dy],
	);

	const style = { transform: `translate(${offset.dx}px, ${offset.dy}px)` };

	return { dragStyle: style, onDragStart: onPointerDown };
}
