import { Store } from "@tanstack/store";
import { nanoid } from "nanoid";
import { type Complex, createComplex } from "../math/complex";
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

	cauchyContour: boolean;
	cauchyCenter: { re: number; im: number };
	cauchyRadius: number;
	cauchyShowImage: boolean;
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

	cauchyContour: false,
	cauchyCenter: { re: 0, im: 0 },
	cauchyRadius: 1.5,
	cauchyShowImage: false,
};

export const explorerStore = new Store<ExplorerState>(initialState);

// --- Actions ---

function addSingularityPair(type: "pole" | "zero", re: number, im: number): void {
	explorerStore.setState((prev) => {
		const listKey = type === "pole" ? "poles" : "zeros";
		const list = prev[listKey] as Complex[];
		const needsPair = prev.enforceConjugates && Math.abs(im) > 0.01;

		if (needsPair) {
			const id1 = nanoid();
			const id2 = nanoid();
			const item1: Complex = { id: id1, type, re, im, pairId: id2 };
			const item2: Complex = { id: id2, type, re, im: -im, pairId: id1 };
			return { ...prev, [listKey]: [...list, item1, item2] };
		}

		return {
			...prev,
			[listKey]: [...list, { id: nanoid(), type, re, im: needsPair ? im : im }],
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

export function setMode(mode: "poles-zeros" | "expression"): void {
	explorerStore.setState((prev) => ({ ...prev, mode }));
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

export function reset(): void {
	explorerStore.setState(() => ({ ...initialState }));
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

explorerStore.subscribe(() => {
	if (skipHistoryCapture) return;

	const current = explorerStore.state;
	if (current === previousState) return;

	undoStack.push(previousState);
	if (undoStack.length > HISTORY_LIMIT) {
		undoStack.shift();
	}
	redoStack.length = 0;
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
