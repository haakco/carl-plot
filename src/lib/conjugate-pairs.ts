import type { Store } from "@tanstack/store";
import { nanoid } from "nanoid";
import type { Complex } from "@/math/complex";
import { createComplex } from "@/math/complex";
import type { ExplorerState } from "@/store/explorer-store";

export const CONJUGATE_AXIS_THRESHOLD = 0.05;

export function shouldCreateConjugatePair(im: number): boolean {
	return Math.abs(im) >= CONJUGATE_AXIS_THRESHOLD;
}

export function createConjugatePair(
	type: "pole" | "zero",
	re: number,
	im: number,
): [Complex, Complex] {
	const id1 = nanoid();
	const id2 = nanoid();
	return [
		{ id: id1, type, re, im, pairId: id2 },
		{ id: id2, type, re, im: -im, pairId: id1 },
	];
}

export function createComplexEntries(
	type: "pole" | "zero",
	re: number,
	im: number,
	enforceConjugates: boolean,
): Complex[] {
	if (enforceConjugates && shouldCreateConjugatePair(im)) {
		return createConjugatePair(type, re, im);
	}
	return [createComplex(type, re, im)];
}

export function restoreConjugatePairs(
	items: Complex[],
	pairIndices?: [number, number][],
): Complex[] {
	if (!pairIndices) return items;

	const restored = [...items];
	for (const [i, j] of pairIndices) {
		if (i >= restored.length || j >= restored.length) continue;
		const [first, second] = createConjugatePair(restored[i].type, restored[i].re, restored[i].im);
		restored[i] = { ...restored[i], id: first.id, pairId: first.pairId };
		restored[j] = { ...restored[j], id: second.id, pairId: second.pairId };
	}
	return restored;
}

/** Enforce conjugate pair symmetry when a pole or zero is moved. */
export function enforceConjugate(
	store: Store<ExplorerState>,
	id: string,
	newPosition: { re: number; im: number },
): void {
	store.setState((prev) => {
		const inPoles = prev.poles.find((p) => p.id === id);
		const inZeros = prev.zeros.find((z) => z.id === id);
		const item = inPoles ?? inZeros;

		if (!item) return prev;

		const listKey = inPoles ? "poles" : "zeros";
		const list = prev[listKey] as Complex[];

		if (!shouldCreateConjugatePair(newPosition.im)) {
			const updatedList = list
				.filter((entry) => entry.id !== item.pairId)
				.map((entry) =>
					entry.id === id ? { ...entry, re: newPosition.re, im: 0, pairId: undefined } : entry,
				);
			return { ...prev, [listKey]: updatedList };
		}

		const existingPartner = item.pairId
			? list.find((entry) => entry.id === item.pairId)
			: undefined;

		if (existingPartner) {
			const updatedList = list.map((entry) => {
				if (entry.id === id) {
					return { ...entry, ...newPosition };
				}
				if (entry.id === existingPartner.id) {
					return { ...entry, re: newPosition.re, im: -newPosition.im };
				}
				return entry;
			});
			return { ...prev, [listKey]: updatedList };
		}

		const [updatedItem, partner] = createConjugatePair(item.type, newPosition.re, newPosition.im);
		const updatedList = [
			...list.map((entry) =>
				entry.id === id ? { ...entry, ...newPosition, pairId: updatedItem.pairId } : entry,
			),
			{ ...partner, pairId: id },
		];

		return { ...prev, [listKey]: updatedList };
	});
}
