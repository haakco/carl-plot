import { createConjugatePair } from "@/lib/conjugate-pairs";
import { type Complex, createComplex } from "../math/complex";

export type PresetCategory = "basics" | "filters" | "controls";

export interface Preset {
	name: string;
	description: string;
	category: PresetCategory;
	poles: Complex[];
	zeros: Complex[];
	gain: number;
	center: { re: number; im: number };
	zoom: number;
}

export const presets: Preset[] = [
	{
		name: "Simple pole",
		category: "basics",
		description: "f(z) = 1/(z - 1) — simple pole on the real axis",
		poles: [createComplex("pole", 1, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0.5, im: 0 },
		zoom: 1,
	},
	{
		name: "Simple zero",
		category: "basics",
		description: "f(z) = z — zero at the origin, colors cycle once counterclockwise",
		poles: [],
		zeros: [createComplex("zero", 0, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Pole and zero",
		category: "basics",
		description: "f(z) = z/(z - 2) — observe how the zero and pole distort the color field",
		poles: [createComplex("pole", 2, 0)],
		zeros: [createComplex("zero", 0, 0)],
		gain: 1,
		center: { re: 1, im: 0 },
		zoom: 0.8,
	},
	{
		name: "Conjugate poles",
		category: "basics",
		description: "f(z) = 1/((z-1-i)(z-1+i)) — conjugate pair, notice symmetric color cycling",
		poles: [...createConjugatePair("pole", 1, 1)],
		zeros: [],
		gain: 1,
		center: { re: 1, im: 0 },
		zoom: 0.8,
	},
	{
		name: "Double pole at origin",
		category: "basics",
		description: "f(z) = 1/z² — order-2 pole, colors cycle twice around the singularity",
		poles: [createComplex("pole", 0, 0), createComplex("pole", 0, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Möbius transform",
		category: "basics",
		description: "f(z) = (z-1)/(z+1) — maps the right half-plane to the unit disk",
		poles: [createComplex("pole", -1, 0)],
		zeros: [createComplex("zero", 1, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.8,
	},
	{
		name: "All-pass filter",
		category: "filters",
		description: "f(z) = (z-0.5)/(1-0.5z) — zero and pole are reflections across the unit circle",
		poles: [createComplex("pole", 2, 0)],
		zeros: [createComplex("zero", 0.5, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.5,
	},
	{
		name: "Butterworth lowpass",
		category: "filters",
		description: "Order-2 Butterworth — two conjugate poles at 45° inside the unit circle",
		poles: [...createConjugatePair("pole", -Math.SQRT1_2, Math.SQRT1_2)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.7,
	},
	{
		name: "Lightly damped pair",
		category: "filters",
		description:
			"Poles near the imaginary axis — watch the strong resonant behavior in the domain coloring",
		poles: [...createConjugatePair("pole", -0.1, 1.5)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.6,
	},

	// --- ChemE / Control Systems ---

	{
		name: "PID controller",
		category: "controls",
		description: "Typical PID: two zeros (derivative/integral action) and a pole at the origin",
		poles: [createComplex("pole", 0, 0)],
		zeros: [createComplex("zero", -1, 0), createComplex("zero", -5, 0)],
		gain: 10,
		center: { re: -2, im: 0 },
		zoom: 0.3,
	},
	{
		name: "First-order with delay",
		category: "controls",
		description: "Single real pole with a Padé-approximated transport delay zero in the RHP",
		poles: [createComplex("pole", -0.5, 0)],
		zeros: [createComplex("zero", 2, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.5,
	},
	{
		name: "Second-order underdamped",
		category: "controls",
		description: "Classic ζ = 0.3 conjugate pole pair — strong oscillatory response",
		poles: [...createConjugatePair("pole", -0.3, 0.954)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.7,
	},
	{
		name: "Notch filter",
		category: "controls",
		description:
			"Conjugate zero pair on the unit circle with poles pulled inside — rejects one frequency",
		poles: [...createConjugatePair("pole", 0.6, 0.6)],
		zeros: [...createConjugatePair("zero", Math.SQRT1_2, Math.SQRT1_2)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.7,
	},
	{
		name: "Lead compensator",
		category: "controls",
		description: "Zero closer to origin than pole — adds phase lead for faster response",
		poles: [createComplex("pole", -10, 0)],
		zeros: [createComplex("zero", -2, 0)],
		gain: 5,
		center: { re: -5, im: 0 },
		zoom: 0.2,
	},
	{
		name: "Lag compensator",
		category: "controls",
		description:
			"Pole closer to origin than zero — boosts low-frequency gain without destabilizing",
		poles: [createComplex("pole", -0.1, 0)],
		zeros: [createComplex("zero", -1, 0)],
		gain: 1,
		center: { re: -0.5, im: 0 },
		zoom: 0.7,
	},
	{
		name: "CSTR linearization",
		category: "controls",
		description: "Typical chemical reactor transfer function — unstable pole with stabilizing zero",
		poles: [...createConjugatePair("pole", 0.2, 0.8), createComplex("pole", -1.5, 0)],
		zeros: [createComplex("zero", -0.5, 0)],
		gain: 2,
		center: { re: -0.5, im: 0 },
		zoom: 0.5,
	},
];
