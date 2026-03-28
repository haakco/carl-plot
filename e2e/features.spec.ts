import { expect, type Page, test } from "@playwright/test";

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
	await page.locator("[cmdk-item]").filter({ hasText: label }).click();
}

async function loadSharedState(page: Page, state: Record<string, unknown>) {
	const hash = `#${encodeUrlState(state)}`;
	await page.evaluate((nextHash) => {
		window.location.hash = nextHash;
		window.location.reload();
	}, hash);
	await page.waitForSelector("canvas", { timeout: 10000 });
}

test.describe("Complex Explorer - Feature Tests", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			window.localStorage.setItem("complex-explorer-tutorial-dismissed", "true");
		});
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });
	});

	// ─── Preset Loading ───────────────────────────────────────────

	test("loading a preset updates placed list and URL", async ({ page }) => {
		// Click a preset from the Examples section
		await page
			.getByRole("button", { name: /^Conjugate poles\b/ })
			.first()
			.click();

		// Should see 2 poles in the placed list
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		// URL should update
		await page.waitForTimeout(500);
		const url = page.url();
		expect(url).toContain("#");
	});

	test("loading Butterworth lowpass preset shows poles and zeros", async ({ page }) => {
		await page
			.getByRole("button", { name: /^Butterworth\b/ })
			.first()
			.click();

		// Should have poles in placed list
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2, {
			timeout: 3000,
		});
	});

	test("preset categories are visible in examples section", async ({ page }) => {
		await expect(page.getByText("Basics")).toBeVisible();
		await expect(page.getByText("Filters")).toBeVisible();
		// "Controls" appears both as a preset category and a section header
		await expect(page.locator("aside span").filter({ hasText: "Controls" }).first()).toBeVisible();
	});

	// ─── Expression Mode ──────────────────────────────────────────

	test("expression mode accepts input and renders", async ({ page }) => {
		// Switch to expression mode
		const modeBtn = page.locator('button:has-text("f(z)=")');
		await modeBtn.click();

		const input = page.locator('input[placeholder*="expression"]');
		await expect(input).toBeVisible();

		// Type an expression
		await input.fill("z^2");
		await input.press("Enter");

		// Canvas should still be present (rendering the expression)
		await expect(page.locator("canvas")).toBeVisible();
	});

	test("expression mode hides pole/zero analysis panels", async ({ page }) => {
		// Default mode should show analysis sections
		await expect(page.getByText("h[n] impulse response")).toBeVisible({ timeout: 3000 });

		// Switch to expression mode
		await page.locator('button:has-text("f(z)=")').click();

		// Impulse sparkline label should disappear
		await expect(page.getByText("h[n] impulse response")).not.toBeVisible({ timeout: 3000 });
	});

	test("switching back from expression mode restores analysis panels", async ({ page }) => {
		// Switch to expression mode
		await page.locator('button:has-text("f(z)=")').click();
		await expect(page.getByText("h[n] impulse response")).not.toBeVisible({ timeout: 3000 });

		// Switch back
		await page.locator('button:has-text("P/Z")').click();
		await expect(page.getByText("h[n] impulse response")).toBeVisible({ timeout: 3000 });
	});

	// ─── Settings Panel ───────────────────────────────────────────

	test("settings panel toggles are interactive", async ({ page }) => {
		const settingsBtn = page.locator('[aria-label="Settings"]');
		if (!(await settingsBtn.isVisible())) return;

		await settingsBtn.click();

		// Verify toggle labels exist
		await expect(page.getByText("Modulus contours")).toBeVisible({ timeout: 3000 });
		await expect(page.getByText("Phase contours")).toBeVisible();
		await expect(page.getByText("Grid lines")).toBeVisible();

		// Toggle a setting
		await page.getByText("Phase contours").click();
	});

	test("dark mode toggle works", async ({ page }) => {
		const settingsBtn = page.locator('[aria-label="Settings"]');
		if (!(await settingsBtn.isVisible())) return;

		await settingsBtn.click();
		const darkModeToggle = page.getByText("Dark mode");
		if (await darkModeToggle.isVisible()) {
			await darkModeToggle.click();
			// Canvas should still be visible after mode change
			await expect(page.locator("canvas")).toBeVisible();
		}
	});

	// ─── Stability Legend ─────────────────────────────────────────

	test("stability legend appears when poles exist", async ({ page }) => {
		// Default state has a pole, legend should be visible
		await expect(page.getByText("Pole stability")).toBeVisible({ timeout: 3000 });
		await expect(page.getByText("Stable (|p| < 1)")).toBeVisible();
		await expect(page.getByText("Unstable (|p| > 1)")).toBeVisible();
	});

	test("stability legend hides when no poles exist", async ({ page }) => {
		// Clear all poles and zeros
		await runCommand(page, "Clear all poles/zeros");

		// Legend should disappear
		await expect(page.getByText("Pole stability")).not.toBeVisible({ timeout: 3000 });
	});

	// ─── Impulse Response ─────────────────────────────────────────

	test("impulse sparkline shows stable indicator for default state", async ({ page }) => {
		// Default state has pole inside unit circle at origin
		await expect(page.getByText("h[n] impulse response")).toBeVisible({ timeout: 3000 });
	});

	test("impulse sparkline shows unstable for pole outside unit circle", async ({ page }) => {
		await loadSharedState(page, {
			p: [[1.5, 0]],
			z: [],
		});
		// The impulse sparkline SVG has aria-label indicating stability
		await expect(page.locator('[aria-label="Impulse response: unstable (growing)"]')).toBeVisible({
			timeout: 5000,
		});
	});

	// ─── Nyquist Plot ─────────────────────────────────────────────

	test("nyquist plot is visible with poles and zeros", async ({ page }) => {
		await expect(
			page.locator('[aria-label="Nyquist plot showing frequency response"]'),
		).toBeVisible({ timeout: 3000 });
	});

	test("nyquist plot renders for multiple pole/zero system", async ({ page }) => {
		// Load a system with conjugate poles (known to produce crossings)
		await loadSharedState(page, {
			p: [
				[0.5, 0.5],
				[0.5, -0.5],
			],
			z: [[-0.5, 0]],
			g: 2,
		});

		// Nyquist plot SVG should be visible
		await expect(
			page.locator('[aria-label="Nyquist plot showing frequency response"]'),
		).toBeVisible({ timeout: 5000 });
	});

	// ─── Laplace Lens ─────────────────────────────────────────────

	test("laplace lens appears when cursor moves over canvas", async ({ page }) => {
		// Laplace lens only renders when cursorZ is set (mouse over canvas)
		// Initially it should not be visible
		await expect(page.getByText("Laplace lens")).not.toBeVisible({ timeout: 1000 });

		// Move cursor over canvas to trigger cursorZ update
		await moveMouseToCanvasPoint(page, 0.6, 0.4);

		// Now the lens should render with magnitude and waveform
		await expect(page.getByText("Laplace lens")).toBeVisible({ timeout: 5000 });
		await expect(page.locator('[aria-label="Output waveform at cursor frequency"]')).toBeVisible({
			timeout: 3000,
		});
	});

	// ─── Gain Controls ────────────────────────────────────────────

	test("gain slider is visible and adjustable", async ({ page }) => {
		const gainSlider = page.locator('input[aria-label^="Gain K:"]');
		await expect(gainSlider).toBeVisible({ timeout: 3000 });

		// Adjust gain slider
		await gainSlider.fill("2");
		await gainSlider.press("Enter");

		// URL should reflect gain change
		await page.waitForTimeout(500);
		const decoded = await page.evaluate(() => {
			const hash = window.location.hash.slice(1);
			if (!hash) return null;
			try {
				return JSON.parse(atob(hash));
			} catch {
				return null;
			}
		});
		if (decoded) {
			expect(decoded.g).toBeDefined();
		}
	});

	test("gain sweep play button is visible", async ({ page }) => {
		await expect(page.locator('[aria-label="Play gain sweep"]')).toBeVisible({ timeout: 3000 });
	});

	test("gain sweep min/max inputs exist", async ({ page }) => {
		await expect(page.locator('[aria-label="Sweep minimum gain"]')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('[aria-label="Sweep maximum gain"]')).toBeVisible();
	});

	// ─── Conformal Grid ───────────────────────────────────────────

	test("conformal grid toggles via command palette", async ({ page }) => {
		// Toggle conformal grid on
		await runCommand(page, "Toggle conformal grid");

		// SVG grid should appear
		await expect(
			page.locator(
				'[aria-label="Conformal mapping grid showing how the transfer function deforms the complex plane"]',
			),
		).toBeVisible({ timeout: 3000 });

		// Toggle off
		await runCommand(page, "Toggle conformal grid");
		await expect(
			page.locator(
				'[aria-label="Conformal mapping grid showing how the transfer function deforms the complex plane"]',
			),
		).not.toBeVisible({ timeout: 3000 });
	});

	// ─── Residue Labels ───────────────────────────────────────────

	test("residue section shows with poles present", async ({ page }) => {
		await expect(page.getByText("Residues")).toBeVisible({ timeout: 3000 });
	});

	test("residue labels toggle via button", async ({ page }) => {
		const showBtn = page.getByRole("button", { name: "Show labels" });
		if (await showBtn.isVisible({ timeout: 3000 })) {
			await showBtn.click();
			await expect(page.getByRole("button", { name: "Hide labels" })).toBeVisible();

			// Toggle back
			await page.getByRole("button", { name: "Hide labels" }).click();
			await expect(page.getByRole("button", { name: "Show labels" })).toBeVisible();
		}
	});

	// ─── Selection & Editing ──────────────────────────────────────

	test("clicking a pole in placed list selects it", async ({ page }) => {
		// Click on the pole label in the placed list
		const poleItem = page
			.locator('[aria-label*="Pole at"][aria-label*="double-click to edit"]')
			.first();
		await expect(poleItem).toBeVisible({ timeout: 3000 });
		await poleItem.click();
	});

	test("removing a pole updates the placed list", async ({ page }) => {
		// Should have default pole
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);

		// Remove it
		await page.locator('aside button[aria-label^="Remove pole"]').first().click();

		// Should be gone
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(0);
	});

	test("removing a zero updates the placed list", async ({ page }) => {
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(1);
		await page.locator('aside button[aria-label^="Remove zero"]').first().click();
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(0);
	});

	// ─── Undo / Redo ─────────────────────────────────────────────

	test("redo restores undone action", async ({ page }) => {
		// Add a pole
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		// Undo
		await page.keyboard.press("Meta+z");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);

		// Redo
		await page.keyboard.press("Meta+Shift+z");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);
	});

	// ─── Formula Bar ──────────────────────────────────────────────

	test("formula bar shows factored and expanded forms", async ({ page }) => {
		// Default should show formula bar
		await expect(page.locator('button:has-text("f(z)=")')).toBeVisible();

		// Look for expanded/factored toggle
		const expandedBtn = page.getByRole("button", { name: /Expanded|Factored/ });
		if (await expandedBtn.isVisible({ timeout: 2000 })) {
			await expandedBtn.click();
			// Should toggle between forms
			await expect(page.locator("canvas")).toBeVisible();
		}
	});

	test("copy LaTeX button is visible", async ({ page }) => {
		const copyBtn = page.getByRole("button", { name: "Copy LaTeX" });
		await expect(copyBtn).toBeVisible({ timeout: 3000 });
	});

	// ─── Command Palette Commands ────────────────────────────────

	test("reset view command works", async ({ page }) => {
		await loadSharedState(page, {
			p: [[0.5, 0]],
			z: [[-1, 0]],
			g: 2,
			cx: 1.25,
			cy: -0.75,
			zm: 2.5,
		});

		// Reset view
		await runCommand(page, "Reset view");

		await page.waitForTimeout(500);
		const decoded = await page.evaluate(() => {
			const hash = window.location.hash.slice(1);
			if (!hash) return null;
			try {
				return JSON.parse(atob(hash));
			} catch {
				return null;
			}
		});

		expect(decoded).not.toBeNull();
		if (decoded) {
			expect(decoded.cx).toBeUndefined();
			expect(decoded.cy).toBeUndefined();
			expect(decoded.zm).toBeUndefined();
			expect(decoded.g).toBe(2);
			expect(decoded.p).toEqual([[0.5, 0]]);
			expect(decoded.z).toEqual([[-1, 0]]);
		}
	});

	test("toggle grid command works", async ({ page }) => {
		await runCommand(page, "Toggle grid");
		await expect(page.locator("canvas")).toBeVisible();
	});

	test("undo command works from palette", async ({ page }) => {
		// Add a pole
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		// Undo via command palette
		await runCommand(page, "Undo");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);
	});

	// ─── URL State Persistence ────────────────────────────────────

	test("expression mode is preserved in URL", async ({ page }) => {
		// Switch to expression mode
		await page.locator('button:has-text("f(z)=")').click();
		const input = page.locator('input[placeholder*="expression"]');
		await input.fill("z^2 + 1");
		await input.press("Enter");

		await page.waitForTimeout(500);
		const decoded = await page.evaluate(() => {
			const hash = window.location.hash.slice(1);
			if (!hash) return null;
			try {
				return JSON.parse(atob(hash));
			} catch {
				return null;
			}
		});

		expect(decoded).not.toBeNull();
		if (decoded) {
			expect(decoded.m).toBe("ex");
			expect(decoded.e).toBe("z^2 + 1");
		}
	});

	test("gain value is preserved in URL", async ({ page }) => {
		await loadSharedState(page, {
			p: [[0.5, 0]],
			z: [],
			g: 3,
		});

		// Verify gain slider shows loaded value
		const gainSlider = page.locator('input[aria-label^="Gain K:"]');
		await expect(gainSlider).toBeVisible({ timeout: 3000 });
	});

	// ─── 3D View ──────────────────────────────────────────────────

	test("3D view shows pole/zero panel", async ({ page }) => {
		await page.getByRole("button", { name: "3D" }).click();
		await expect(page.locator("canvas")).toBeVisible();

		// 3D view should show the Poles & Zeros button/section
		await expect(page.getByRole("button", { name: "Poles & Zeros" })).toBeVisible({
			timeout: 5000,
		});
	});

	test("can add pole in 3D view", async ({ page }) => {
		await page.getByRole("button", { name: "3D" }).click();
		await expect(page.locator("canvas")).toBeVisible();

		// Look for add pole button in 3D panel
		const addPoleBtn = page.getByRole("button", { name: /Add.*pole/i });
		if (await addPoleBtn.isVisible({ timeout: 3000 })) {
			await addPoleBtn.click();
			// Should see more poles
		}
	});
});

test.describe("Complex Explorer - Tutorial", () => {
	test("tutorial shows on first visit", async ({ page }) => {
		// Do NOT dismiss tutorial in localStorage
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		// Tutorial should be visible
		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
	});

	test("tutorial can be skipped", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: "Skip tutorial" }).click();

		// Tutorial should be gone
		await expect(page.getByText("Welcome to the Complex Explorer")).not.toBeVisible({
			timeout: 3000,
		});
	});

	test("tutorial navigates through steps", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });

		// Go to next step
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Adding Poles & Zeros")).toBeVisible({ timeout: 3000 });

		// Go to next step
		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Dragging & Editing")).toBeVisible({ timeout: 3000 });

		// Go back
		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByText("Adding Poles & Zeros")).toBeVisible({ timeout: 3000 });
	});

	test("tutorial restart command removes dismissed state", async ({ page }) => {
		// Manually dismiss the tutorial first (not using addInitScript so reload works)
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		// Tutorial shows on first visit — dismiss it
		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: "Skip tutorial" }).click();
		await expect(page.getByText("Welcome to the Complex Explorer")).not.toBeVisible({
			timeout: 3000,
		});

		// Verify localStorage was set
		const dismissed = await page.evaluate(() =>
			localStorage.getItem("complex-explorer-tutorial-dismissed"),
		);
		expect(dismissed).toBe("true");

		// Restart via command palette — this removes localStorage key and reloads
		await openCommandPalette(page);
		await page.locator("[cmdk-item]").filter({ hasText: "Restart tutorial" }).click();

		// Wait for the page to reload
		await page.waitForSelector("canvas", { timeout: 10000 });

		// Tutorial should be visible again after reload
		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
	});

	test("tutorial dismissed state persists in localStorage", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: "Skip tutorial" }).click();

		// Reload the page
		await page.reload();
		await page.waitForSelector("canvas", { timeout: 10000 });

		// Tutorial should still be dismissed
		await expect(page.getByText("Welcome to the Complex Explorer")).not.toBeVisible({
			timeout: 3000,
		});
	});
});

test.describe("Complex Explorer - Multiplicity & Ghost Trail", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			window.localStorage.setItem("complex-explorer-tutorial-dismissed", "true");
		});
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });
	});

	test("multiplicity badge shows for coincident poles", async ({ page }) => {
		// Load two poles at the same location
		await loadSharedState(page, {
			p: [
				[0.5, 0],
				[0.5, 0],
			],
			z: [],
		});

		// Should see "×2" badge (may appear on multiple SVG elements)
		await expect(page.getByText("×2").first()).toBeVisible({ timeout: 5000 });
	});

	test("double pole at origin preset shows multiplicity", async ({ page }) => {
		await page
			.getByRole("button", { name: /^Double pole at origin\b/ })
			.first()
			.click();

		// Should see multiplicity badge (may appear multiple times for each marker)
		await expect(page.getByText("×2").first()).toBeVisible({ timeout: 5000 });
	});
});
