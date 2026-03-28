import { expect, test } from "@playwright/test";

test.describe("Complex Explorer - Core Interactions", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Wait for the WebGL canvas to be present
		await page.waitForSelector("canvas", { timeout: 10000 });
	});

	test("page loads with title and main layout", async ({ page }) => {
		await expect(page.locator("text=Complex Explorer")).toBeVisible();
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
			await expect(page.locator("text=Contour")).toBeVisible({ timeout: 3000 });
		}
	});

	test("coordinate readout shows cursor position", async ({ page }) => {
		// Hover over the canvas
		const canvas = page.locator("canvas").first();
		const box = await canvas.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			// Coordinate readout should be visible
			await expect(page.locator("text=Re")).toBeVisible({ timeout: 3000 });
		}
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
});
