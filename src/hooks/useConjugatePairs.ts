import type { Store } from "@tanstack/store";
import { nanoid } from "nanoid";
import type { Complex } from "@/math/complex";
import type { ExplorerState } from "@/store/explorer-store";

const REAL_AXIS_THRESHOLD = 0.05;
const OFF_AXIS_THRESHOLD = 0.01;

/**
 * Enforce conjugate pair symmetry when a pole or zero is moved.
 *
 * When a singularity is dragged off the real axis (|Im| > OFF_AXIS_THRESHOLD),
 * its conjugate partner is created or moved symmetrically. When dragged close
 * to the real axis (|Im| < REAL_AXIS_THRESHOLD), the pair merges into a single
 * real-valued singularity.
 *
 * Call this from drag handlers, not as middleware.
 */
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

		const isNearRealAxis = Math.abs(newPosition.im) < REAL_AXIS_THRESHOLD;
		const isOffRealAxis = Math.abs(newPosition.im) > OFF_AXIS_THRESHOLD;

		if (isNearRealAxis) {
			return mergeToReal(prev, listKey, list, id, item, newPosition.re);
		}

		if (isOffRealAxis) {
			return ensureConjugatePartner(prev, listKey, list, id, item, newPosition);
		}

		return {
			...prev,
			[listKey]: list.map((entry) => (entry.id === id ? { ...entry, ...newPosition } : entry)),
		};
	});
}

function mergeToReal(
	state: ExplorerState,
	listKey: "poles" | "zeros",
	list: Complex[],
	id: string,
	item: Complex,
	realValue: number,
): ExplorerState {
	const pairId = item.pairId;
	const updatedList = list
		.filter((entry) => entry.id !== pairId)
		.map((entry) =>
			entry.id === id ? { ...entry, re: realValue, im: 0, pairId: undefined } : entry,
		);

	return { ...state, [listKey]: updatedList };
}

function ensureConjugatePartner(
	state: ExplorerState,
	listKey: "poles" | "zeros",
	list: Complex[],
	id: string,
	item: Complex,
	newPosition: { re: number; im: number },
): ExplorerState {
	const existingPartner = item.pairId ? list.find((entry) => entry.id === item.pairId) : undefined;

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
		return { ...state, [listKey]: updatedList };
	}

	const partnerId = nanoid();
	const updatedList = [
		...list.map((entry) =>
			entry.id === id ? { ...entry, ...newPosition, pairId: partnerId } : entry,
		),
		{
			id: partnerId,
			type: item.type,
			re: newPosition.re,
			im: -newPosition.im,
			pairId: id,
		} as Complex,
	];

	return { ...state, [listKey]: updatedList };
}
