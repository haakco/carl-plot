import { createComplex } from "@/math/complex";
import { explorerStore, loadPreset } from "./explorer-store";
import { type Preset, type PresetCategory, presets } from "./presets";

export interface ExplorerExample {
	name: string;
	description: string;
	category: PresetCategory;
	thumbnailLabel: string;
	kind: "preset" | "expression";
	preset?: Preset;
	expression?: string;
	center: { re: number; im: number };
	zoom: number;
}

function presetExample(preset: Preset): ExplorerExample {
	return {
		name: preset.name,
		description: preset.description,
		category: preset.category,
		thumbnailLabel: `Preview of ${preset.name}`,
		kind: "preset",
		preset,
		center: preset.center,
		zoom: preset.zoom,
	};
}

const expressionExamples: ExplorerExample[] = [
	{
		name: "Joukowski airfoil",
		description:
			"f(z) = z + 1/z — classic conformal mapping that pinches the unit circle into an airfoil",
		category: "basics",
		thumbnailLabel: "Preview of Joukowski airfoil",
		kind: "expression",
		expression: "z + 1/z",
		center: { re: 0, im: 0 },
		zoom: 0.9,
	},
	{
		name: "Riemann zeta approximation",
		description:
			"Finite Dirichlet series: 1 + 1/(2^z) + ... + 1/(5^z) for stripe-like phase structure",
		category: "basics",
		thumbnailLabel: "Preview of Riemann zeta approximation",
		kind: "expression",
		expression: "1 + 1/(2^z) + 1/(3^z) + 1/(4^z) + 1/(5^z)",
		center: { re: 1.75, im: 0 },
		zoom: 0.7,
	},
];

export const examples: ExplorerExample[] = [...presets.map(presetExample), ...expressionExamples];

export function applyExplorerExample(example: ExplorerExample): void {
	if (example.kind === "preset" && example.preset) {
		loadPreset(example.preset);
		return;
	}

	explorerStore.setState((prev) => ({
		...prev,
		mode: "expression",
		expression: example.expression ?? "",
		expressionError: null,
		expressionLatex: "",
		center: example.center,
		zoom: example.zoom,
		selectedId: null,
		hoveredId: null,
	}));
}

export function loadIdentityFunction(): void {
	loadPreset({
		name: "Identity",
		description: "f(z) = 1",
		category: "basics",
		poles: [],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	});
}

export function loadReciprocalFunction(): void {
	loadPreset({
		name: "1/z",
		description: "Single pole at the origin",
		category: "basics",
		poles: [createComplex("pole", 0, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	});
}

export function loadSquareFunction(): void {
	loadPreset({
		name: "z^2",
		description: "Double zero at the origin",
		category: "basics",
		poles: [],
		zeros: [createComplex("zero", 0, 0), createComplex("zero", 0, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	});
}

export function loadSinFunction(): void {
	explorerStore.setState((prev) => ({
		...prev,
		mode: "expression",
		expression: "sin(z)",
		expressionError: null,
		expressionLatex: "",
		center: { re: 0, im: 0 },
		zoom: 1,
		selectedId: null,
		hoveredId: null,
	}));
}
