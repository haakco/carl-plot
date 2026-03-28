import { expect, type Page, test } from "@playwright/test";

async function getStorePoles(page: Page) {
	return page.evaluate(() => {
		const store = (window as any).__explorerStore;
		if (!store) return null;
		return store.state.poles.map((p: any) => ({
			id: p.id,
			re: Math.round(p.re * 1000) / 1000,
			im: Math.round(p.im * 1000) / 1000,
			pairId: p.pairId,
		}));
	});
}

async function getStoreSnapshot(page: Page) {
	return page.evaluate(() => {
		const store = (window as any).__explorerStore;
		if (!store) return null;
		const s = store.state;
		return {
			poles: s.poles.map((p: any) => ({ id: p.id, re: p.re, im: p.im, pairId: p.pairId })),
			zeros: s.zeros.map((z: any) => ({ id: z.id, re: z.re, im: z.im })),
			center: s.center,
			zoom: s.zoom,
		};
	});
}

/**
 * Dispatch drag events matching PoleZeroMarker's handler pattern:
 * pointerdown on the <g> element, then pointermove/pointerup on window.
 */
async function dragMarker(
	page: Page,
	markerSelector: string,
	deltaX: number,
	deltaY: number,
	steps = 10,
) {
	const markerInfo = await page.evaluate((selector) => {
		const g = document.querySelector(selector);
		if (!g) return null;
		const rect = g.getBoundingClientRect();
		return { centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 };
	}, markerSelector);
	if (!markerInfo) throw new Error(`Marker not found: ${markerSelector}`);

	const startX = markerInfo.centerX;
	const startY = markerInfo.centerY;

	await page.evaluate(
		({ selector, x, y }) => {
			const g = document.querySelector(selector);
			if (!g) throw new Error("marker not found");
			g.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: x,
					clientY: y,
					bubbles: true,
					cancelable: true,
					pointerId: 1,
					pointerType: "mouse",
					button: 0,
					buttons: 1,
				}),
			);
		},
		{ selector: markerSelector, x: startX, y: startY },
	);

	for (let step = 1; step <= steps; step++) {
		const ratio = step / steps;
		await page.evaluate(
			({ x, y }) => {
				window.dispatchEvent(
					new PointerEvent("pointermove", {
						clientX: x,
						clientY: y,
						bubbles: true,
						cancelable: true,
						pointerId: 1,
						pointerType: "mouse",
						button: 0,
						buttons: 1,
					}),
				);
			},
			{ x: startX + deltaX * ratio, y: startY + deltaY * ratio },
		);
		await page.waitForTimeout(20);
	}

	const endX = startX + deltaX;
	const endY = startY + deltaY;
	await page.evaluate(
		({ x, y }) => {
			window.dispatchEvent(
				new PointerEvent("pointerup", {
					clientX: x,
					clientY: y,
					bubbles: true,
					cancelable: true,
					pointerId: 1,
					pointerType: "mouse",
					button: 0,
				}),
			);
		},
		{ x: endX, y: endY },
	);

	return { startX, startY, endX, endY };
}

test.describe("Pole/Zero Drag Interactions", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			window.localStorage.setItem("complex-explorer-tutorial-dismissed", "true");
		});
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });
		await page.waitForTimeout(1000);
	});

	test("vertical drag moves pole proportionally", async ({ page }) => {
		await dragMarker(page, 'g[aria-label*="Pole"]', 0, -300, 20);
		await page.waitForTimeout(100);

		const polesAfter = await getStorePoles(page);
		expect(polesAfter![0].im).toBeGreaterThan(0.25);
	});

	test("markers move with background pan", async ({ page }) => {
		const markerBefore = await page.evaluate(() => {
			const g = document.querySelector('g[aria-label*="Pole"]');
			return g ? g.getBoundingClientRect() : null;
		});
		expect(markerBefore).not.toBeNull();

		// Pan the canvas
		const canvas = page.locator("canvas").first();
		const canvasBox = await canvas.boundingBox();
		if (!canvasBox) throw new Error("canvas not found");

		const panStartX = canvasBox.x + canvasBox.width * 0.3;
		const panStartY = canvasBox.y + canvasBox.height * 0.3;
		await page.mouse.move(panStartX, panStartY);
		await page.mouse.down();
		for (let step = 1; step <= 10; step++) {
			await page.mouse.move(panStartX + step * 20, panStartY + step * 10, { steps: 1 });
			await page.waitForTimeout(30);
		}
		await page.mouse.up();
		await page.waitForTimeout(300);

		// Pole complex coordinates should NOT change
		const stateAfter = await getStoreSnapshot(page);
		expect(stateAfter?.poles[0].re).toBe(2);
		expect(stateAfter?.poles[0].im).toBe(0);

		// But marker PIXEL position should have moved
		const markerAfter = await page.evaluate(() => {
			const g = document.querySelector('g[aria-label*="Pole"]');
			return g ? g.getBoundingClientRect() : null;
		});
		expect(markerAfter).not.toBeNull();

		const pixelDeltaX = markerAfter!.x - markerBefore!.x;
		const pixelDeltaY = markerAfter!.y - markerBefore!.y;
		expect(Math.abs(pixelDeltaX)).toBeGreaterThan(50);
		expect(Math.abs(pixelDeltaY)).toBeGreaterThan(20);
	});

	test("drag pole after panning preserves correct coordinates", async ({ page }) => {
		// First pan
		const canvas = page.locator("canvas").first();
		const canvasBox = await canvas.boundingBox();
		if (!canvasBox) throw new Error("canvas not found");

		const panStartX = canvasBox.x + canvasBox.width * 0.3;
		const panStartY = canvasBox.y + canvasBox.height * 0.3;
		await page.mouse.move(panStartX, panStartY);
		await page.mouse.down();
		for (let step = 1; step <= 10; step++) {
			await page.mouse.move(panStartX + step * 15, panStartY + step * 15, { steps: 1 });
			await page.waitForTimeout(30);
		}
		await page.mouse.up();
		await page.waitForTimeout(300);

		const polesBefore = await getStorePoles(page);

		// Now drag the pole vertically
		await dragMarker(page, 'g[aria-label*="Pole"]', 0, -150, 15);
		await page.waitForTimeout(100);

		const polesAfter = await getStorePoles(page);
		expect(polesAfter![0].im).toBeGreaterThan(polesBefore![0].im);
	});

	test("URL state updates after drag", async ({ page }) => {
		await dragMarker(page, 'g[aria-label*="Pole"]', 0, -200, 15);
		await page.waitForTimeout(600);

		const decoded = await page.evaluate(() => {
			try {
				return JSON.parse(atob(window.location.hash.slice(1)));
			} catch {
				return null;
			}
		});

		expect(decoded).not.toBeNull();
		expect(decoded.p).toBeDefined();
		const topPole = decoded.p.find((p: number[]) => p[1] > 0);
		expect(topPole).toBeDefined();
	});
});
