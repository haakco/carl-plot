import { beforeEach, describe, expect, it } from "vitest";
import { explorerStore, reset } from "@/store/explorer-store";
import { decodeStateFromUrl } from "./url-state";

beforeEach(() => {
	reset();
	window.location.hash = "";
});

describe("decodeStateFromUrl", () => {
	it("restores conjugate pairs when pair metadata is present", () => {
		const hash = btoa(
			JSON.stringify({
				p: [
					[1, 2],
					[1, -2],
				],
				pp: [[0, 1]],
				z: [
					[-0.5, 1.5],
					[-0.5, -1.5],
				],
				zp: [[0, 1]],
			}),
		);
		window.location.hash = `#${hash}`;

		expect(decodeStateFromUrl()).toBe(true);

		const [poleA, poleB] = explorerStore.state.poles;
		const [zeroA, zeroB] = explorerStore.state.zeros;

		expect(poleA.pairId).toBe(poleB.id);
		expect(poleB.pairId).toBe(poleA.id);
		expect(zeroA.pairId).toBe(zeroB.id);
		expect(zeroB.pairId).toBe(zeroA.id);
	});

	it("does not infer pairs when pair metadata is absent", () => {
		const hash = btoa(
			JSON.stringify({
				p: [
					[1, 2],
					[1, -2],
				],
			}),
		);
		window.location.hash = `#${hash}`;

		expect(decodeStateFromUrl()).toBe(true);

		const [poleA, poleB] = explorerStore.state.poles;
		// Without pp metadata, poles are independent
		expect(poleA.pairId).toBeUndefined();
		expect(poleB.pairId).toBeUndefined();
	});
});
