import { stat } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

function encodeUrlState(state: Record<string, unknown>): string {
	return Buffer.from(JSON.stringify(state)).toString("base64");
}

async function moveMouseToCanvasPoint(page: Page, xRatio: number, yRatio: number) {
	const canvas = page.locator('main[aria-label="Complex plane visualization"] canvas').first();
	const box = await canvas.boundingBox();
	expect(box).not.toBeNull();
	if (!box) throw new Error("Canvas bounding box unavailable");

	await page.mouse.move(box.x + box.width * xRatio, box.y + box.height * yRatio);
	return box;
}

async function openCommandPalette(page: Page) {
	await page.keyboard.press("Meta+k");
	await expect(page.locator('input[placeholder*="command"]')).toBeVisible();
}

async function runCommand(page: Page, label: string) {
	await openCommandPalette(page);
	await page.locator('[cmdk-item]').filter({ hasText: label }).click();
}

async function loadSharedState(page: Page, state: Record<string, unknown>) {
	const hash = `#${encodeUrlState(state)}`;
	await page.evaluate((nextHash) => {
		window.location.hash = nextHash;
		window.location.reload();
	}, hash);
	await page.waitForSelector("canvas", { timeout: 10000 });
}

test.describe("Complex Explorer - Core Interactions", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			window.localStorage.setItem("complex-explorer-tutorial-dismissed", "true");
		});
		await page.goto("/");
		// Wait for the WebGL canvas to be present
		await page.waitForSelector("canvas", { timeout: 10000 });
	});

	test("page loads with title and main layout", async ({ page }) => {
		await expect(page.locator("header").getByText("Complex Explorer", { exact: true })).toBeVisible();
		await expect(page.locator("canvas")).toBeVisible();
	});

	test("toolbox is visible with Create section", async ({ page }) => {
		await expect(page.locator("text=Create")).toBeVisible();
		await expect(page.locator('[aria-label*="Create pole"]')).toBeVisible();
		await expect(page.locator('[aria-label*="Create zero"]')).toBeVisible();
	});

	test("can add a pole via keyboard", async ({ page }) => {
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");
		// Should see the placed list update
		await expect(page.locator("text=Placed")).toBeVisible();
	});

	test("can add a zero via keyboard", async ({ page }) => {
		const zeroDrag = page.locator('[aria-label*="Create zero"]');
		await zeroDrag.focus();
		await zeroDrag.press("Enter");
		await expect(page.locator("text=Placed")).toBeVisible();
	});

	test("formula bar is visible", async ({ page }) => {
		// Formula bar should show f(z) content
		await expect(page.locator('button:has-text("f(z)=")')).toBeVisible();
	});

	test("2D/3D view toggle works", async ({ page }) => {
		const btn3d = page.locator('button:has-text("3D")');
		await btn3d.click();
		// Canvas should still be present (now 3D via react-three-fiber)
		await expect(page.locator("canvas")).toBeVisible();

		const btn2d = page.locator('button:has-text("2D")');
		await btn2d.click();
		await expect(page.locator("canvas")).toBeVisible();
	});

	test("command palette opens with Cmd+K", async ({ page }) => {
		await page.keyboard.press("Meta+k");
		await expect(page.locator('input[placeholder*="command"]')).toBeVisible();
	});

	test("mode toggle switches between P/Z and expression", async ({ page }) => {
		// Click the mode toggle button
		const modeBtn = page.locator('button:has-text("f(z)=")');
		await modeBtn.click();
		// Should now show an expression input
		await expect(page.locator('input[placeholder*="expression"]')).toBeVisible();

		// Switch back
		const pzBtn = page.locator('button:has-text("P/Z")');
		await pzBtn.click();
		// Expression input should be gone
		await expect(page.locator('input[placeholder*="expression"]')).not.toBeVisible();
	});

	test("settings panel opens", async ({ page }) => {
		// Find and click the settings trigger
		const settingsBtn = page.locator('[aria-label*="ettings"], button:has-text("Settings")').first();
		if (await settingsBtn.isVisible()) {
			await settingsBtn.click();
			// Settings content should be visible
			await expect(page.getByText("Modulus contours")).toBeVisible({ timeout: 3000 });
		}
	});

	test("coordinate readout shows cursor position", async ({ page }) => {
		await moveMouseToCanvasPoint(page, 0.7, 0.35);
		await expect(page.locator('[aria-label="Cursor position on complex plane"]')).toBeVisible({
			timeout: 3000,
		});
	});

	test("URL state encodes on interaction", async ({ page }) => {
		// Add a pole
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");

		// Wait for debounced URL update
		await page.waitForTimeout(500);

		// URL should contain a hash
		const url = page.url();
		expect(url).toContain("#");
	});

	test("presets are listed in the Examples section", async ({ page }) => {
		await expect(page.locator("text=Examples")).toBeVisible();
	});

	test("cursor readout uses loaded center and zoom from shared URL", async ({ page }) => {
		await loadSharedState(page, {
			cx: 1.25,
			cy: -0.75,
			zm: 2,
			p: [[2, 0]],
			z: [[0, 0]],
		});
		await moveMouseToCanvasPoint(page, 0.5, 0.5);

		await expect(page.locator('[aria-label="Cursor position on complex plane"]')).toContainText(
			/z = 1\.25 [−-] 0\.75i/,
		);
	});

	test("undo ignores cursor-only updates", async ({ page }) => {
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		await moveMouseToCanvasPoint(page, 0.2, 0.2);
		await moveMouseToCanvasPoint(page, 0.8, 0.8);
		await page.keyboard.press("Meta+z");

		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);
	});

	test("shared conjugate pairs stay linked when one is removed", async ({ page }) => {
		await loadSharedState(page, {
			p: [
				[1, 2],
				[1, -2],
			],
			pp: [[0, 1]],
		});
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		await page.locator('aside button[aria-label^="Remove pole"]').first().click();

		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(0);
		await expect(page.locator("text=Drag a pole")).toBeVisible();
	});

	test("keyboard nudging preserves conjugate symmetry", async ({ page }) => {
		await page.getByRole("button", { name: /^Conjugate poles\b/ }).first().click();
		await expect(page.getByLabel("Pole at 1.00 + 1.00i, double-click to edit")).toBeVisible();

		await page.getByLabel("Pole at 1.00 + 1.00i, double-click to edit").click();
		await page.keyboard.press("ArrowUp");

		await expect(page.getByLabel("Pole at 1.00 + 1.10i, double-click to edit")).toBeVisible();
		await expect(page.getByLabel("Pole at 1.00 - 1.10i, double-click to edit")).toBeVisible();
	});

	test("loaded viewport continues from shared state during pan", async ({ page }) => {
		await loadSharedState(page, {
			cx: 1,
			cy: 0.5,
			zm: 1.6,
			p: [[2, 0]],
			z: [[0, 0]],
		});

		const box = await moveMouseToCanvasPoint(page, 0.5, 0.5);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65, { steps: 8 });
		await page.mouse.up();

		await page.waitForTimeout(400);
		const decoded = await page.evaluate(() => JSON.parse(atob(window.location.hash.slice(1))));

		expect(decoded.cx).not.toBe(0);
		expect(decoded.cy).not.toBe(0);
		expect(Math.abs(decoded.cx)).toBeGreaterThan(0.2);
		expect(Math.abs(decoded.cy)).toBeGreaterThan(0.2);
	});

	test("clear all poles and zeros empties the placed list", async ({ page }) => {
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(1);

		await runCommand(page, "Clear all poles/zeros");

		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(0);
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(0);
		await expect(page.locator("text=Drag a pole")).toBeVisible();
	});

	test("exports a non-empty PNG from the 2D canvas", async ({ page }, testInfo) => {
		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: "Export canvas as PNG" }).click();
		const download = await downloadPromise;

		const downloadPath = testInfo.outputPath("export-2d.png");
		await download.saveAs(downloadPath);

		expect(download.suggestedFilename()).toMatch(/^complex-explorer-\d+\.png$/);
		const fileSize = (await stat(downloadPath)).size;
		expect(fileSize).toBeGreaterThan(0);
	});

	test("exports a non-empty PNG from the 3D canvas", async ({ page }, testInfo) => {
		await page.getByRole("button", { name: "3D" }).click();
		await expect(page.locator("canvas")).toBeVisible();

		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: "Export canvas as PNG" }).click();
		const download = await downloadPromise;

		const downloadPath = testInfo.outputPath("export-3d.png");
		await download.saveAs(downloadPath);

		expect(download.suggestedFilename()).toMatch(/^complex-explorer-\d+\.png$/);
		const fileSize = (await stat(downloadPath)).size;
		expect(fileSize).toBeGreaterThan(0);
	});
});
