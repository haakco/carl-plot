import { restoreConjugatePairs } from "@/lib/conjugate-pairs";
import type { Complex } from "@/math/complex";
import { createComplex } from "@/math/complex";
import { explorerStore, loadPreset } from "@/store/explorer-store";

interface UrlState {
	m?: "pz" | "ex";
	p?: [number, number][];
	z?: [number, number][];
	/** Conjugate pair indices: [[i, j], ...] where p[i] and p[j] are paired */
	pp?: [number, number][];
	/** Conjugate pair indices for zeros */
	zp?: [number, number][];
	g?: number;
	e?: string;
	cx?: number;
	cy?: number;
	zm?: number;
	v?: "2d" | "3d";
}

function serializeComplex(items: Complex[]): [number, number][] {
	return items.map((c) => [Math.round(c.re * 1000) / 1000, Math.round(c.im * 1000) / 1000]);
}

/** Extract pair index tuples from a list of Complex items. */
function serializePairs(items: Complex[]): [number, number][] | undefined {
	const pairs: [number, number][] = [];
	const seen = new Set<string>();
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item.pairId || seen.has(item.id)) continue;
		const j = items.findIndex((x) => x.id === item.pairId);
		if (j >= 0) {
			pairs.push([i, j]);
			seen.add(item.id);
			seen.add(items[j].id);
		}
	}
	return pairs.length > 0 ? pairs : undefined;
}

function deserializeComplex(
	type: "pole" | "zero",
	coords: [number, number][],
	pairIndices?: [number, number][],
): Complex[] {
	return restoreConjugatePairs(
		coords.map(([re, im]) => createComplex(type, re, im)),
		pairIndices,
	);
}

export function encodeStateToUrl(): void {
	const state = explorerStore.state;

	const urlState: UrlState = {};

	if (state.mode === "expression") {
		urlState.m = "ex";
		if (state.expression) urlState.e = state.expression;
	} else {
		if (state.poles.length > 0) {
			urlState.p = serializeComplex(state.poles);
			urlState.pp = serializePairs(state.poles);
		}
		if (state.zeros.length > 0) {
			urlState.z = serializeComplex(state.zeros);
			urlState.zp = serializePairs(state.zeros);
		}
		if (state.gain !== 1) urlState.g = state.gain;
	}

	if (state.center.re !== 0 || state.center.im !== 0) {
		urlState.cx = Math.round(state.center.re * 1000) / 1000;
		urlState.cy = Math.round(state.center.im * 1000) / 1000;
	}
	if (state.zoom !== 1) urlState.zm = Math.round(state.zoom * 100) / 100;
	if (state.viewMode === "3d") urlState.v = "3d";

	const json = JSON.stringify(urlState);
	const hash = btoa(json);
	window.history.replaceState(null, "", `#${hash}`);
}

export function decodeStateFromUrl(): boolean {
	const hash = window.location.hash.slice(1);
	if (!hash) return false;

	try {
		const json = atob(hash);
		const urlState: UrlState = JSON.parse(json);

		const poles = urlState.p ? deserializeComplex("pole", urlState.p, urlState.pp) : [];
		const zeros = urlState.z ? deserializeComplex("zero", urlState.z, urlState.zp) : [];

		loadPreset({
			name: "URL State",
			description: "Loaded from URL",
			category: "basics",
			poles,
			zeros,
			gain: urlState.g ?? 1,
			center: { re: urlState.cx ?? 0, im: urlState.cy ?? 0 },
			zoom: urlState.zm ?? 1,
		});

		if (urlState.m === "ex" && urlState.e) {
			explorerStore.setState((prev) => ({
				...prev,
				mode: "expression" as const,
				expression: urlState.e ?? "",
			}));
		}

		if (urlState.v === "3d") {
			explorerStore.setState((prev) => ({
				...prev,
				viewMode: "3d" as const,
			}));
		}

		return true;
	} catch {
		return false;
	}
}
