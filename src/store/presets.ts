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

export const presets: Preset[] = [
	{
		name: "Identity",
		description: "f(z) = z --- no poles or zeros",
		poles: [],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Single pole at z = 1",
		description: "f(z) = 1/(z - 1) --- simple pole on the real axis",
		poles: [createComplex("pole", 1, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0.5, im: 0 },
		zoom: 1,
	},
	{
		name: "Single zero at origin",
		description: "f(z) = z --- zero at the origin",
		poles: [],
		zeros: [createComplex("zero", 0, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Conjugate poles at 1 +/- i",
		description: "f(z) = 1/((z - 1 - i)(z - 1 + i)) --- conjugate pair of poles",
		poles: [createComplex("pole", 1, 1), createComplex("pole", 1, -1)],
		zeros: [],
		gain: 1,
		center: { re: 1, im: 0 },
		zoom: 0.8,
	},
	{
		name: "Second-order pole at origin",
		description: "f(z) = 1/z² --- double pole, colors cycle twice",
		poles: [createComplex("pole", 0, 0), createComplex("pole", 0, 0)],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 1,
	},
	{
		name: "Möbius transform",
		description: "f(z) = (z - 1)/(z + 1) --- maps right half-plane to unit disk",
		poles: [createComplex("pole", -1, 0)],
		zeros: [createComplex("zero", 1, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.8,
	},
	{
		name: "All-pass filter",
		description: "f(z) = (z - 0.5)/(1 - 0.5z) --- zero and pole are reflections across unit circle",
		poles: [createComplex("pole", 2, 0)],
		zeros: [createComplex("zero", 0.5, 0)],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.5,
	},
	{
		name: "Butterworth lowpass (order 2)",
		description: "Two conjugate poles at 45° inside the unit circle",
		poles: [
			createComplex("pole", -Math.SQRT1_2, Math.SQRT1_2),
			createComplex("pole", -Math.SQRT1_2, -Math.SQRT1_2),
		],
		zeros: [],
		gain: 1,
		center: { re: 0, im: 0 },
		zoom: 0.7,
	},
];
