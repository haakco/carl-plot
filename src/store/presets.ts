import { nanoid } from "nanoid";
import { type Complex, createComplex } from "../math/complex";

export interface Preset {
	name: string;
	description: string;
	poles: Complex[];
	zeros: Complex[];
	gain: number;
	center: { re: number; im: number };
	zoom: number;
}

/** Create a conjugate pair of Complex items with linked pairIds. */
function createConjugatePair(type: "pole" | "zero", re: number, im: number): [Complex, Complex] {
	const id1 = nanoid();
	const id2 = nanoid();
	return [
		{ id: id1, type, re, im, pairId: id2 },
		{ id: id2, type, re, im: -im, pairId: id1 },
	];
}

export const presets: Preset[] = [
	{
		name: "Simple pole",
		description: "f(z) = 1/(z - 1) — simple pole on the real axis",
		poles: [createComplex("pole", 1, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0.5, im: 0 },
		zoom: 1,
	},
	{
		name: "Simple zero",
		description: "f(z) = z — zero at the origin, colors cycle once counterclockwise",
		poles: [],
		zeros: [createComplex("zero", 0, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Pole and zero",
		description: "f(z) = z/(z - 2) — observe how the zero and pole distort the color field",
		poles: [createComplex("pole", 2, 0)],
		zeros: [createComplex("zero", 0, 0)],
		gain: 1,
		center: { re: 1, im: 0 },
		zoom: 0.8,
	},
	{
		name: "Conjugate poles",
		description: "f(z) = 1/((z-1-i)(z-1+i)) — conjugate pair, notice symmetric color cycling",
		poles: [...createConjugatePair("pole", 1, 1)],
		zeros: [],
		gain: 1,
		center: { re: 1, im: 0 },
		zoom: 0.8,
	},
	{
		name: "Double pole at origin",
		description: "f(z) = 1/z² — order-2 pole, colors cycle twice around the singularity",
		poles: [createComplex("pole", 0, 0), createComplex("pole", 0, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Möbius transform",
		description: "f(z) = (z-1)/(z+1) — maps the right half-plane to the unit disk",
		poles: [createComplex("pole", -1, 0)],
		zeros: [createComplex("zero", 1, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.8,
	},
	{
		name: "All-pass filter",
		description: "f(z) = (z-0.5)/(1-0.5z) — zero and pole are reflections across the unit circle",
		poles: [createComplex("pole", 2, 0)],
		zeros: [createComplex("zero", 0.5, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.5,
	},
	{
		name: "Butterworth lowpass",
		description: "Order-2 Butterworth — two conjugate poles at 45° inside the unit circle",
		poles: [...createConjugatePair("pole", -Math.SQRT1_2, Math.SQRT1_2)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.7,
	},
	{
		name: "Lightly damped pair",
		description:
			"Poles near the imaginary axis — watch the strong resonant behavior in the domain coloring",
		poles: [...createConjugatePair("pole", -0.1, 1.5)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.6,
	},
];
