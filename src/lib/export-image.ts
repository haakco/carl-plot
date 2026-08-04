/**
 * Export the current canvas visualization as a PNG download.
 *
 * Works for both WebGL (2D domain coloring) and Three.js (3D surface) canvases
 * by finding the canvas element within the main visualization area.
 */
export function exportCanvasToPng(filename?: string): void {
	const main = document.querySelector('main[aria-label="Complex plane visualization"]');
	if (!main) return;

	const canvas = main.querySelector("canvas");
	if (!canvas) return;

	const resolvedName = filename ?? `complex-explorer-${Date.now()}.png`;

	canvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = resolvedName;
		link.click();
		URL.revokeObjectURL(url);
	}, "image/png");
}
