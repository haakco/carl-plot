import { beforeEach, describe, expect, it } from "vitest";
import { createComplex } from "../math/complex";
import {
	addPole,
	addZero,
	explorerStore,
	loadPreset,
	moveSingularity,
	redo,
	removeSingularity,
	reset,
	setCenter,
	setGain,
	setZoom,
	undo,
} from "./explorer-store";
import type { Preset } from "./presets";

beforeEach(() => {
	reset();
});

describe("addPole", () => {
	it("adds a pole to the store", () => {
		const initialCount = explorerStore.state.poles.length;
		addPole(5, 0);
		expect(explorerStore.state.poles.length).toBe(initialCount + 1);
		const added = explorerStore.state.poles[explorerStore.state.poles.length - 1];
		expect(added.re).toBe(5);
		expect(added.im).toBe(0);
		expect(added.type).toBe("pole");
	});

	it("creates a conjugate pair when im != 0 and enforceConjugates is true", () => {
		expect(explorerStore.state.enforceConjugates).toBe(true);
		const initialCount = explorerStore.state.poles.length;
		addPole(1, 2);
		expect(explorerStore.state.poles.length).toBe(initialCount + 2);

		const newPoles = explorerStore.state.poles.slice(initialCount);
		expect(newPoles[0].re).toBe(1);
		expect(newPoles[0].im).toBe(2);
		expect(newPoles[1].re).toBe(1);
		expect(newPoles[1].im).toBe(-2);
		expect(newPoles[0].pairId).toBe(newPoles[1].id);
		expect(newPoles[1].pairId).toBe(newPoles[0].id);
	});
});

describe("addZero", () => {
	it("adds a zero to the store", () => {
		const initialCount = explorerStore.state.zeros.length;
		addZero(3, 0);
		expect(explorerStore.state.zeros.length).toBe(initialCount + 1);
		const added = explorerStore.state.zeros[explorerStore.state.zeros.length - 1];
		expect(added.re).toBe(3);
		expect(added.im).toBe(0);
		expect(added.type).toBe("zero");
	});

	it("creates a conjugate pair when im != 0 and enforceConjugates is true", () => {
		const initialCount = explorerStore.state.zeros.length;
		addZero(1, 3);
		expect(explorerStore.state.zeros.length).toBe(initialCount + 2);

		const newZeros = explorerStore.state.zeros.slice(initialCount);
		expect(newZeros[0].im).toBe(3);
		expect(newZeros[1].im).toBe(-3);
		expect(newZeros[0].pairId).toBe(newZeros[1].id);
	});
});

describe("removeSingularity", () => {
	it("removes both the item and its conjugate partner", () => {
		addPole(1, 2); // creates conjugate pair
		const polesBefore = explorerStore.state.poles;
		const pairPole = polesBefore[polesBefore.length - 2];

		removeSingularity(pairPole.id);

		const polesAfter = explorerStore.state.poles;
		expect(polesAfter.find((p) => p.id === pairPole.id)).toBeUndefined();
		expect(polesAfter.find((p) => p.id === pairPole.pairId)).toBeUndefined();
	});
});

describe("moveSingularity", () => {
	it("updates position correctly", () => {
		const pole = explorerStore.state.poles[0];
		moveSingularity(pole.id, 10, 20);

		const updated = explorerStore.state.poles.find((p) => p.id === pole.id);
		expect(updated?.re).toBe(10);
		expect(updated?.im).toBe(20);
	});
});

describe("setGain", () => {
	it("updates gain", () => {
		setGain(5);
		expect(explorerStore.state.gain).toBe(5);
	});
});

describe("setZoom", () => {
	it("updates zoom", () => {
		setZoom(2.5);
		expect(explorerStore.state.zoom).toBe(2.5);
	});
});

describe("setCenter", () => {
	it("updates center", () => {
		setCenter(3, 4);
		expect(explorerStore.state.center).toEqual({ re: 3, im: 4 });
	});
});

describe("reset", () => {
	it("restores initial state", () => {
		setGain(99);
		setZoom(50);
		setCenter(10, 10);
		addPole(7, 7);

		reset();

		expect(explorerStore.state.gain).toBe(1);
		expect(explorerStore.state.zoom).toBe(1);
		expect(explorerStore.state.center).toEqual({ re: 0, im: 0 });
		expect(explorerStore.state.poles.length).toBe(1);
		expect(explorerStore.state.zeros.length).toBe(1);
	});
});

describe("undo / redo", () => {
	it("undo reverts the last action", () => {
		setGain(5);
		expect(explorerStore.state.gain).toBe(5);

		undo();
		expect(explorerStore.state.gain).toBe(1);
	});

	it("redo restores an undone action", () => {
		setGain(5);
		undo();
		expect(explorerStore.state.gain).toBe(1);

		redo();
		expect(explorerStore.state.gain).toBe(5);
	});

	it("multiple undos work in sequence", () => {
		setGain(2);
		setGain(3);
		setGain(4);

		undo();
		expect(explorerStore.state.gain).toBe(3);

		undo();
		expect(explorerStore.state.gain).toBe(2);

		undo();
		expect(explorerStore.state.gain).toBe(1);
	});
});

describe("loadPreset", () => {
	it("loads preset data correctly", () => {
		const preset: Preset = {
			name: "Test preset",
			description: "A test",
			poles: [createComplex("pole", 5, 0)],
			zeros: [createComplex("zero", -1, 0)],
			gain: 3,
			center: { re: 2, im: 1 },
			zoom: 0.5,
		};

		loadPreset(preset);

		expect(explorerStore.state.poles).toEqual(preset.poles);
		expect(explorerStore.state.zeros).toEqual(preset.zeros);
		expect(explorerStore.state.gain).toBe(3);
		expect(explorerStore.state.center).toEqual({ re: 2, im: 1 });
		expect(explorerStore.state.zoom).toBe(0.5);
		expect(explorerStore.state.mode).toBe("poles-zeros");
		expect(explorerStore.state.selectedId).toBeNull();
	});
});
