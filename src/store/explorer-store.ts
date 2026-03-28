import { Store } from "@tanstack/store";
import {
	createComplexEntries,
	createConjugatePair,
	shouldCreateConjugatePair,
} from "@/lib/conjugate-pairs";
import { type Complex, createComplex } from "../math/complex";
import { extractRootsFromExpression } from "../math/extract-roots";
import type { Preset } from "./presets";

export interface ExplorerState {
	mode: "poles-zeros" | "expression";
	poles: Complex[];
	zeros: Complex[];
	gain: number;
	expression: string;
	expressionError: string | null;
	expressionLatex: string;

	center: { re: number; im: number };
	zoom: number;

	viewMode: "2d" | "3d";

	showModContours: boolean;
	showPhaseContours: boolean;
	showGrid: boolean;
	contourDensity: number;

	selectedId: string | null;
	hoveredId: string | null;
	cursorZ: { re: number; im: number } | null;
	enforceConjugates: boolean;

	formulaForm: "factored" | "expanded";
	showAllResidues: boolean;

	showConformalGrid: boolean;

	cauchyContour: boolean;
	cauchyCenter: { re: number; im: number };
	cauchyRadius: number;
	cauchyShowImage: boolean;

	ghostTrail: { re: number; im: number }[];

	webglContextLost: boolean;
}

const initialState: ExplorerState = {
	mode: "poles-zeros",
	poles: [createComplex("pole", 2, 0)],
	zeros: [createComplex("zero", 0, 0)],
	gain: 1,
	expression: "",
	expressionError: null,
	expressionLatex: "",

	center: { re: 0, im: 0 },
	zoom: 1,

	viewMode: "2d",

	showModContours: true,
	showPhaseContours: false,
	showGrid: false,
	contourDensity: 1,

	selectedId: null,
	hoveredId: null,
	cursorZ: null,
	enforceConjugates: true,

	formulaForm: "factored",
	showAllResidues: false,

	showConformalGrid: false,

	cauchyContour: false,
	cauchyCenter: { re: 0, im: 0 },
	cauchyRadius: 1.5,
	cauchyShowImage: false,

	ghostTrail: [],

	webglContextLost: false,
};

export const explorerStore = new Store<ExplorerState>(initialState);

// --- Actions ---

function addSingularityPair(type: "pole" | "zero", re: number, im: number): void {
	explorerStore.setState((prev) => {
		const listKey = type === "pole" ? "poles" : "zeros";
		const list = prev[listKey] as Complex[];
		return {
			...prev,
			[listKey]: [...list, ...createComplexEntries(type, re, im, prev.enforceConjugates)],
		};
	});
}

export function addPole(re: number, im: number): void {
	addSingularityPair("pole", re, im);
}

export function addZero(re: number, im: number): void {
	addSingularityPair("zero", re, im);
}

export function removeSingularity(id: string): void {
	explorerStore.setState((prev) => {
		const item = prev.poles.find((p) => p.id === id) ?? prev.zeros.find((z) => z.id === id);
		const pairId = item?.pairId;
		const shouldRemove = (entry: Complex) => entry.id !== id && entry.id !== pairId;

		return {
			...prev,
			poles: prev.poles.filter(shouldRemove),
			zeros: prev.zeros.filter(shouldRemove),
			selectedId: prev.selectedId === id || prev.selectedId === pairId ? null : prev.selectedId,
			hoveredId: prev.hoveredId === id || prev.hoveredId === pairId ? null : prev.hoveredId,
		};
	});
}

export function moveSingularity(id: string, re: number, im: number): void {
	const updatePosition = (arr: Complex[]) =>
		arr.map((item) => (item.id === id ? { ...item, re, im } : item));

	explorerStore.setState((prev) => ({
		...prev,
		poles: updatePosition(prev.poles),
		zeros: updatePosition(prev.zeros),
	}));
}

/** Check if two roots are conjugates of each other (re ≈ re, im ≈ -im). */
function isConjugatePair(a: { re: number; im: number }, b: { re: number; im: number }): boolean {
	return Math.abs(a.re - b.re) < 0.01 && Math.abs(a.im + b.im) < 0.01;
}

/** Find the index of a conjugate partner for roots[i] in unused roots. */
function findConjugateIndex(
	roots: { re: number; im: number }[],
	i: number,
	used: Set<number>,
): number {
	for (let j = i + 1; j < roots.length; j++) {
		if (!used.has(j) && isConjugatePair(roots[i], roots[j])) return j;
	}
	return -1;
}

/** Create a list of Complex items, linking conjugate pairs when enforced. */
export function buildWithConjugates(
	type: "pole" | "zero",
	roots: { re: number; im: number }[],
	enforceConjugates: boolean,
): Complex[] {
	if (!enforceConjugates) {
		return roots.map((r) => createComplex(type, r.re, r.im));
	}

	const result: Complex[] = [];
	const used = new Set<number>();

	for (let i = 0; i < roots.length; i++) {
		if (used.has(i)) continue;
		const r = roots[i];
		const conjugateIdx = shouldCreateConjugatePair(r.im) ? findConjugateIndex(roots, i, used) : -1;

		if (conjugateIdx >= 0) {
			const [first, second] = createConjugatePair(type, r.re, r.im);
			result.push(first);
			result.push({ ...second, re: roots[conjugateIdx].re, im: roots[conjugateIdx].im });
			used.add(i);
			used.add(conjugateIdx);
		} else {
			result.push(createComplex(type, r.re, r.im));
			used.add(i);
		}
	}

	return result;
}

export function setMode(mode: "poles-zeros" | "expression"): void {
	explorerStore.setState((prev) => {
		if (mode === "poles-zeros" && prev.mode === "expression" && prev.expression) {
			const extracted = extractRootsFromExpression(prev.expression);
			if (extracted) {
				return {
					...prev,
					mode,
					poles: buildWithConjugates("pole", extracted.poles, prev.enforceConjugates),
					zeros: buildWithConjugates("zero", extracted.zeros, prev.enforceConjugates),
					gain: extracted.gain,
					expressionError: null,
				};
			}
			// Extraction failed — preserve existing poles/zeros and warn
			return {
				...prev,
				mode,
				expressionError:
					"Expression could not be converted to poles/zeros. Previous configuration preserved.",
			};
		}
		return { ...prev, mode };
	});
}

export function setExpression(expression: string): void {
	explorerStore.setState((prev) => ({ ...prev, expression }));
}

export function setCenter(re: number, im: number): void {
	explorerStore.setState((prev) => ({ ...prev, center: { re, im } }));
}

export function setZoom(zoom: number): void {
	explorerStore.setState((prev) => ({ ...prev, zoom }));
}

export function setGain(gain: number): void {
	explorerStore.setState((prev) => ({ ...prev, gain }));
}

/** Set gain without creating an undo history entry (for sweep animation). */
export function setGainTransient(gain: number): void {
	skipHistoryCapture = true;
	explorerStore.setState((prev) => ({ ...prev, gain }));
	previousState = explorerStore.state;
	skipHistoryCapture = false;
}

export function setViewMode(viewMode: "2d" | "3d"): void {
	explorerStore.setState((prev) => ({ ...prev, viewMode }));
}

export function setSelectedId(selectedId: string | null): void {
	explorerStore.setState((prev) => ({ ...prev, selectedId }));
}

export function setHoveredId(hoveredId: string | null): void {
	explorerStore.setState((prev) => ({ ...prev, hoveredId }));
}

export function setCursorZ(cursorZ: { re: number; im: number } | null): void {
	explorerStore.setState((prev) => ({ ...prev, cursorZ }));
}

export function toggleModContours(): void {
	explorerStore.setState((prev) => ({
		...prev,
		showModContours: !prev.showModContours,
	}));
}

export function togglePhaseContours(): void {
	explorerStore.setState((prev) => ({
		...prev,
		showPhaseContours: !prev.showPhaseContours,
	}));
}

export function toggleGrid(): void {
	explorerStore.setState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
}

export function toggleEnforceConjugates(): void {
	explorerStore.setState((prev) => ({
		...prev,
		enforceConjugates: !prev.enforceConjugates,
	}));
}

export function toggleShowAllResidues(): void {
	explorerStore.setState((prev) => ({
		...prev,
		showAllResidues: !prev.showAllResidues,
	}));
}

export function toggleFormulaForm(): void {
	explorerStore.setState((prev) => ({
		...prev,
		formulaForm: prev.formulaForm === "factored" ? "expanded" : "factored",
	}));
}

export function toggleConformalGrid(): void {
	explorerStore.setState((prev) => ({ ...prev, showConformalGrid: !prev.showConformalGrid }));
}

export function toggleCauchyContour(): void {
	explorerStore.setState((prev) => ({ ...prev, cauchyContour: !prev.cauchyContour }));
}

export function setCauchyCenter(re: number, im: number): void {
	explorerStore.setState((prev) => ({ ...prev, cauchyCenter: { re, im } }));
}

export function setCauchyRadius(radius: number): void {
	explorerStore.setState((prev) => ({ ...prev, cauchyRadius: Math.max(0.05, radius) }));
}

export function toggleCauchyShowImage(): void {
	explorerStore.setState((prev) => ({ ...prev, cauchyShowImage: !prev.cauchyShowImage }));
}

const MAX_GHOST_POINTS = 40;

export function pushGhostPoint(re: number, im: number): void {
	explorerStore.setState((prev) => {
		const trail =
			prev.ghostTrail.length >= MAX_GHOST_POINTS
				? [...prev.ghostTrail.slice(1), { re, im }]
				: [...prev.ghostTrail, { re, im }];
		return { ...prev, ghostTrail: trail };
	});
}

export function clearGhostTrail(): void {
	explorerStore.setState((prev) => ({ ...prev, ghostTrail: [] }));
}

export function reset(): void {
	explorerStore.setState(() => ({ ...initialState }));
}

export function resetView(): void {
	explorerStore.setState((prev) => ({
		...prev,
		center: { re: 0, im: 0 },
		zoom: 1,
		cursorZ: null,
		ghostTrail: [],
	}));
}

export function clearAll(): void {
	explorerStore.setState((prev) => ({
		...prev,
		poles: [],
		zeros: [],
		gain: 1,
		selectedId: null,
		hoveredId: null,
		expression: "",
		expressionError: null,
		expressionLatex: "",
	}));
}

export function loadPreset(preset: Preset): void {
	explorerStore.setState((prev) => ({
		...prev,
		mode: "poles-zeros" as const,
		poles: preset.poles,
		zeros: preset.zeros,
		gain: preset.gain,
		center: preset.center,
		zoom: preset.zoom,
		expression: "",
		expressionError: null,
		expressionLatex: "",
		selectedId: null,
		hoveredId: null,
	}));
}

// --- Undo / Redo History ---

const HISTORY_LIMIT = 50;
const undoStack: ExplorerState[] = [];
const redoStack: ExplorerState[] = [];
let previousState: ExplorerState = explorerStore.state;
let skipHistoryCapture = false;

/** Check whether the change is to a field that should be undoable. */
function isUndoableChange(prev: ExplorerState, next: ExplorerState): boolean {
	// These transient fields should NOT trigger undo entries
	if (
		prev.cursorZ !== next.cursorZ ||
		prev.hoveredId !== next.hoveredId ||
		prev.center !== next.center ||
		prev.zoom !== next.zoom ||
		prev.ghostTrail !== next.ghostTrail ||
		prev.webglContextLost !== next.webglContextLost
	) {
		// Check if ONLY transient fields changed
		const withoutTransient = (s: ExplorerState) => ({
			mode: s.mode,
			poles: s.poles,
			zeros: s.zeros,
			gain: s.gain,
			expression: s.expression,
			expressionError: s.expressionError,
			expressionLatex: s.expressionLatex,
			showModContours: s.showModContours,
			showPhaseContours: s.showPhaseContours,
			showGrid: s.showGrid,
			contourDensity: s.contourDensity,
			selectedId: s.selectedId,
			enforceConjugates: s.enforceConjugates,
			formulaForm: s.formulaForm,
			showAllResidues: s.showAllResidues,
			viewMode: s.viewMode,
			cauchyContour: s.cauchyContour,
			cauchyCenter: s.cauchyCenter,
			cauchyRadius: s.cauchyRadius,
			cauchyShowImage: s.cauchyShowImage,
		});
		const a = withoutTransient(prev);
		const b = withoutTransient(next);
		// Quick structural comparison — all are primitives or object refs
		return Object.keys(a).some((key) => a[key as keyof typeof a] !== b[key as keyof typeof b]);
	}
	return true;
}

explorerStore.subscribe(() => {
	if (skipHistoryCapture) return;

	const current = explorerStore.state;
	if (current === previousState) return;

	if (isUndoableChange(previousState, current)) {
		undoStack.push(previousState);
		if (undoStack.length > HISTORY_LIMIT) {
			undoStack.shift();
		}
		redoStack.length = 0;
	}
	previousState = current;
});

export function undo(): void {
	const snapshot = undoStack.pop();
	if (!snapshot) return;

	redoStack.push(explorerStore.state);
	skipHistoryCapture = true;
	explorerStore.setState(() => snapshot);
	previousState = snapshot;
	skipHistoryCapture = false;
}

export function redo(): void {
	const snapshot = redoStack.pop();
	if (!snapshot) return;

	undoStack.push(explorerStore.state);
	skipHistoryCapture = true;
	explorerStore.setState(() => snapshot);
	previousState = snapshot;
	skipHistoryCapture = false;
}
