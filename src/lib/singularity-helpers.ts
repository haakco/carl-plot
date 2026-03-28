import { enforceConjugate } from "@/lib/conjugate-pairs";
import { explorerStore, moveSingularity } from "@/store/explorer-store";

const SNAP_GRID = 100;

/**
 * Stability glow color for poles based on magnitude relative to the unit circle.
 * Z-transform / discrete-time interpretation:
 *   |p| < 1  => stable (inside unit circle)
 *   |p| ~ 1  => marginally stable
 *   |p| > 1  => unstable (outside unit circle)
 */
export function getStabilityColor(re: number, im: number): string {
	const magnitude = Math.sqrt(re * re + im * im);
	if (magnitude < 0.95) return "oklch(0.7 0.15 145)"; // green - stable
	if (magnitude < 1.05) return "oklch(0.7 0.15 85)"; // yellow - marginal
	return "oklch(0.7 0.15 25)"; // red - unstable
}

export function snapToGrid(value: number): number {
	return Math.round(value * SNAP_GRID) / SNAP_GRID;
}

export function parseCoordinate(raw: string): { re: number; im: number } | null {
	const s = raw.trim().replace(/\s/g, "");
	if (!s) return null;

	// Try "a+bi" or "a-bi" format
	const match = s.match(/^([+-]?[\d.]+)([+-][\d.]+)i$/);
	if (match) {
		const re = Number.parseFloat(match[1]);
		const im = Number.parseFloat(match[2]);
		if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
		return { re, im };
	}

	// Pure imaginary "bi"
	const imMatch = s.match(/^([+-]?[\d.]+)i$/);
	if (imMatch) {
		const im = Number.parseFloat(imMatch[1]);
		if (!Number.isFinite(im)) return null;
		return { re: 0, im };
	}

	// Pure real
	const re = Number.parseFloat(s);
	if (Number.isFinite(re)) return { re, im: 0 };

	return null;
}

/**
 * Move a singularity, respecting the conjugate enforcement setting.
 */
export function moveWithConjugate(itemId: string, position: { re: number; im: number }): void {
	if (explorerStore.state.enforceConjugates) {
		enforceConjugate(explorerStore, itemId, position);
	} else {
		moveSingularity(itemId, position.re, position.im);
	}
}
