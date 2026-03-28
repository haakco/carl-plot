import { beforeEach, describe, expect, it } from "vitest";
import { createComplex } from "../math/complex";
import {
	addPole,
	addZero,
	clearAll,
	clearGhostTrail,
	explorerStore,
	loadPreset,
	moveSingularity,
	pushGhostPoint,
	redo,
	removeSingularity,
	reset,
	resetView,
	setCenter,
	setCursorZ,
	setGain,
	setGainTransient,
	setZoom,
	toggleConformalGrid,
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

	it("ignores cursor-only updates when capturing undo history", () => {
		setGain(5);
		setCursorZ({ re: 1, im: -2 });

		undo();

		expect(explorerStore.state.gain).toBe(1);
		expect(explorerStore.state.cursorZ).toBeNull();
	});
});

describe("loadPreset", () => {
	it("loads preset data correctly", () => {
		const preset: Preset = {
			name: "Test preset",
			description: "A test",
			category: "basics",
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

describe("clearAll", () => {
	it("removes all poles and zeros instead of restoring defaults", () => {
		clearAll();

		expect(explorerStore.state.poles).toEqual([]);
		expect(explorerStore.state.zeros).toEqual([]);
		expect(explorerStore.state.gain).toBe(1);
	});

	it("preserves view settings when clearing", () => {
		setCenter(5, 3);
		setZoom(2);
		clearAll();

		expect(explorerStore.state.center).toEqual({ re: 5, im: 3 });
		expect(explorerStore.state.zoom).toBe(2);
	});
});

describe("resetView", () => {
	it("resets center and zoom without touching the current function", () => {
		addPole(3, 0);
		setGain(4);
		setCenter(5, 3);
		setZoom(2);

		resetView();

		expect(explorerStore.state.center).toEqual({ re: 0, im: 0 });
		expect(explorerStore.state.zoom).toBe(1);
		expect(explorerStore.state.gain).toBe(4);
		expect(explorerStore.state.poles).toHaveLength(2);
		expect(explorerStore.state.zeros).toHaveLength(1);
	});
});

describe("ghostTrail", () => {
	it("pushGhostPoint adds a point to the trail", () => {
		expect(explorerStore.state.ghostTrail).toEqual([]);
		pushGhostPoint(1, 2);
		expect(explorerStore.state.ghostTrail).toEqual([{ re: 1, im: 2 }]);
	});

	it("clearGhostTrail empties the trail", () => {
		pushGhostPoint(1, 2);
		pushGhostPoint(3, 4);
		clearGhostTrail();
		expect(explorerStore.state.ghostTrail).toEqual([]);
	});

	it("caps at 40 points", () => {
		for (let i = 0; i < 50; i++) {
			pushGhostPoint(i, i);
		}
		expect(explorerStore.state.ghostTrail.length).toBe(40);
		// First point should be shifted out
		expect(explorerStore.state.ghostTrail[0].re).toBe(10);
	});

	it("does not pollute undo history", () => {
		setGain(5);
		pushGhostPoint(1, 2);
		pushGhostPoint(3, 4);
		clearGhostTrail();

		undo();
		// Should undo gain change, not ghost trail changes
		expect(explorerStore.state.gain).toBe(1);
	});
});

describe("setGainTransient", () => {
	it("updates gain without creating undo entry", () => {
		setGain(2);
		setGainTransient(5);
		setGainTransient(7);
		setGainTransient(9);

		expect(explorerStore.state.gain).toBe(9);

		undo();
		// Should undo to before setGain(2), skipping all transient changes
		expect(explorerStore.state.gain).toBe(1);
	});
});

describe("toggleConformalGrid", () => {
	it("toggles showConformalGrid", () => {
		expect(explorerStore.state.showConformalGrid).toBe(false);
		toggleConformalGrid();
		expect(explorerStore.state.showConformalGrid).toBe(true);
		toggleConformalGrid();
		expect(explorerStore.state.showConformalGrid).toBe(false);
	});
});
