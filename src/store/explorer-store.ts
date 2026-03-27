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
}

const initialState: ExplorerState = {
	mode: "poles-zeros",
	poles: [createComplex("pole", 2, 0)],
	zeros: [createComplex("zero", 0, 0)],
	gain: 1,
	expression: "",

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
	enforceConjugates: false,
};

export const explorerStore = new Store<ExplorerState>(initialState);

// --- Actions ---

export function addPole(re: number, im: number): void {
	explorerStore.setState((prev) => ({
		...prev,
		poles: [...prev.poles, { id: nanoid(), type: "pole" as const, re, im }],
	}));
}

export function addZero(re: number, im: number): void {
	explorerStore.setState((prev) => ({
		...prev,
		zeros: [...prev.zeros, { id: nanoid(), type: "zero" as const, re, im }],
	}));
}

export function removeSingularity(id: string): void {
	explorerStore.setState((prev) => ({
		...prev,
		poles: prev.poles.filter((p) => p.id !== id),
		zeros: prev.zeros.filter((z) => z.id !== id),
		selectedId: prev.selectedId === id ? null : prev.selectedId,
		hoveredId: prev.hoveredId === id ? null : prev.hoveredId,
	}));
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
