import type { Complex } from "@/math/complex";
import { createComplex } from "@/math/complex";
import { explorerStore, loadPreset } from "@/store/explorer-store";

interface UrlState {
	m?: "pz" | "ex";
	p?: [number, number][];
	z?: [number, number][];
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

function deserializeComplex(type: "pole" | "zero", pairs: [number, number][]): Complex[] {
	return pairs.map(([re, im]) => createComplex(type, re, im));
}

export function encodeStateToUrl(): void {
	const state = explorerStore.state;

	const urlState: UrlState = {};

	if (state.mode === "expression") {
		urlState.m = "ex";
		if (state.expression) urlState.e = state.expression;
	} else {
		if (state.poles.length > 0) urlState.p = serializeComplex(state.poles);
		if (state.zeros.length > 0) urlState.z = serializeComplex(state.zeros);
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

		const poles = urlState.p ? deserializeComplex("pole", urlState.p) : [];
		const zeros = urlState.z ? deserializeComplex("zero", urlState.z) : [];

		loadPreset({
			name: "URL State",
			description: "Loaded from URL",
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
