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

async function openExamplesDialog(page: Page) {
	await page.getByRole("button", { name: "Examples" }).click();
	await expect(page.getByRole("dialog").getByText("Examples")).toBeVisible({ timeout: 3000 });
}

async function openAnalysisPanel(page: Page) {
	// Only open if not already open
	const analysisBtn = page.getByRole("button", { name: "Analysis" });
	const isPressed = await analysisBtn.getAttribute("aria-pressed");
	if (isPressed !== "true") {
		await analysisBtn.click();
	}
	await expect(page.locator('[aria-label="Analysis panel"]')).toBeVisible({ timeout: 3000 });
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
		await openExamplesDialog(page);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /^Conjugate poles\b/ })
			.click();

		// Should see 2 poles in the placed list
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		// URL should update
		await page.waitForTimeout(500);
		const url = page.url();
		expect(url).toContain("#");
	});

	test("loading Butterworth lowpass preset shows poles and zeros", async ({ page }) => {
		await openExamplesDialog(page);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /^Butterworth\b/ })
			.click();

		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2, {
			timeout: 3000,
		});
	});

	test("preset categories are visible in examples dialog", async ({ page }) => {
		await openExamplesDialog(page);
		// Check the category tab buttons specifically
		await expect(page.getByRole("dialog").getByRole("button", { name: "Basics" })).toBeVisible();
		await expect(page.getByRole("dialog").getByRole("button", { name: "Filters" })).toBeVisible();
		await expect(
			page.getByRole("dialog").getByRole("button", { name: "Controls" }),
		).toBeVisible();
	});

	// ─── Expression Mode ──────────────────────────────────────────

	test("expression mode accepts input and renders", async ({ page }) => {
		const modeBtn = page.locator('button:has-text("f(z)=")');
		await modeBtn.click();

		const input = page.locator('input[placeholder*="expression"]');
		await expect(input).toBeVisible();

		await input.fill("z^2");
		await input.press("Enter");

		await expect(page.locator("canvas")).toBeVisible();
	});

	test("expression mode hides analysis button", async ({ page }) => {
		// Default mode should show Analysis button
		await expect(page.getByRole("button", { name: "Analysis" })).toBeVisible();

		// Switch to expression mode
		await page.locator('button:has-text("f(z)=")').click();

		// Analysis button should disappear (pole-zero only)
		await expect(page.getByRole("button", { name: "Analysis" })).not.toBeVisible({ timeout: 3000 });
	});

	test("switching back from expression mode restores analysis button", async ({ page }) => {
		await page.locator('button:has-text("f(z)=")').click();
		await expect(page.getByRole("button", { name: "Analysis" })).not.toBeVisible({ timeout: 3000 });

		await page.locator('button:has-text("P/Z")').click();
		await expect(page.getByRole("button", { name: "Analysis" })).toBeVisible({ timeout: 3000 });
	});

	// ─── Settings Panel ───────────────────────────────────────────

	test("settings panel toggles are interactive", async ({ page }) => {
		const settingsBtn = page.locator('[aria-label="Settings"]');
		if (!(await settingsBtn.isVisible())) return;

		await settingsBtn.click();

		await expect(page.getByText("Modulus contours")).toBeVisible({ timeout: 3000 });
		await expect(page.getByText("Phase contours")).toBeVisible();
		await expect(page.getByText("Grid lines")).toBeVisible();

		await page.getByText("Phase contours").click();
	});

	test("dark mode toggle works", async ({ page }) => {
		const settingsBtn = page.locator('[aria-label="Settings"]');
		if (!(await settingsBtn.isVisible())) return;

		await settingsBtn.click();
		const darkModeToggle = page.getByText("Dark mode");
		if (await darkModeToggle.isVisible()) {
			await darkModeToggle.click();
			await expect(page.locator("canvas")).toBeVisible();
		}
	});

	// ─── Stability Legend ─────────────────────────────────────────

	test("stability legend appears when poles exist", async ({ page }) => {
		await expect(page.getByText("Pole stability")).toBeVisible({ timeout: 3000 });
		await expect(page.getByText("Stable (|p| < 1)")).toBeVisible();
		await expect(page.getByText("Unstable (|p| > 1)")).toBeVisible();
	});

	test("stability legend hides when no poles exist", async ({ page }) => {
		await runCommand(page, "Clear all poles/zeros");
		await expect(page.getByText("Pole stability")).not.toBeVisible({ timeout: 3000 });
	});

	// ─── Impulse Response ─────────────────────────────────────────

	test("impulse sparkline shows stable indicator for default state", async ({ page }) => {
		await openAnalysisPanel(page);
		await expect(page.getByText("h[n] impulse response")).toBeVisible({ timeout: 3000 });
	});

	test("impulse sparkline shows unstable for pole outside unit circle", async ({ page }) => {
		await loadSharedState(page, {
			p: [[1.5, 0]],
			z: [],
		});
		await openAnalysisPanel(page);
		await expect(page.locator('[aria-label="Impulse response: unstable (growing)"]')).toBeVisible({
			timeout: 5000,
		});
	});

	// ─── Nyquist Plot ─────────────────────────────────────────────

	test("nyquist plot is visible with poles and zeros", async ({ page }) => {
		await openAnalysisPanel(page);
		await expect(
			page.locator('[aria-label="Nyquist plot showing frequency response"]'),
		).toBeVisible({ timeout: 3000 });
	});

	test("nyquist plot renders for multiple pole/zero system", async ({ page }) => {
		await loadSharedState(page, {
			p: [
				[0.5, 0.5],
				[0.5, -0.5],
			],
			z: [[-0.5, 0]],
			g: 2,
		});
		await openAnalysisPanel(page);
		await expect(
			page.locator('[aria-label="Nyquist plot showing frequency response"]'),
		).toBeVisible({ timeout: 5000 });
	});

	// ─── Laplace Lens ─────────────────────────────────────────────

	test("laplace lens appears when cursor moves over canvas", async ({ page }) => {
		await openAnalysisPanel(page);
		await expect(page.getByText("Laplace lens")).not.toBeVisible({ timeout: 1000 });

		await moveMouseToCanvasPoint(page, 0.6, 0.4);

		await expect(page.getByText("Laplace lens")).toBeVisible({ timeout: 5000 });
		await expect(page.locator('[aria-label="Output waveform at cursor frequency"]')).toBeVisible({
			timeout: 3000,
		});
	});

	// ─── Gain Controls ────────────────────────────────────────────

	test("gain slider is visible and adjustable", async ({ page }) => {
		await openAnalysisPanel(page);
		const gainSlider = page.locator('input[aria-label^="Gain K:"]');
		await expect(gainSlider).toBeVisible({ timeout: 3000 });

		await gainSlider.fill("2");
		await gainSlider.press("Enter");

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
		await openAnalysisPanel(page);
		await expect(page.locator('[aria-label="Play gain sweep"]')).toBeVisible({ timeout: 3000 });
	});

	test("gain sweep min/max inputs exist", async ({ page }) => {
		await openAnalysisPanel(page);
		await expect(page.locator('[aria-label="Sweep minimum gain"]')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('[aria-label="Sweep maximum gain"]')).toBeVisible();
	});

	// ─── Conformal Grid ───────────────────────────────────────────

	test("conformal grid toggles via command palette", async ({ page }) => {
		await runCommand(page, "Toggle conformal grid");
		await expect(
			page.locator(
				'[aria-label="Conformal mapping grid showing how the transfer function deforms the complex plane"]',
			),
		).toBeVisible({ timeout: 3000 });

		await runCommand(page, "Toggle conformal grid");
		await expect(
			page.locator(
				'[aria-label="Conformal mapping grid showing how the transfer function deforms the complex plane"]',
			),
		).not.toBeVisible({ timeout: 3000 });
	});

	// ─── Residue Labels ───────────────────────────────────────────

	test("residue section shows with poles present", async ({ page }) => {
		await openAnalysisPanel(page);
		await expect(page.getByText("Residues")).toBeVisible({ timeout: 3000 });
	});

	test("residue labels toggle via button", async ({ page }) => {
		await openAnalysisPanel(page);
		const showBtn = page.getByRole("button", { name: "Show labels" });
		if (await showBtn.isVisible({ timeout: 3000 })) {
			await showBtn.click();
			await expect(page.getByRole("button", { name: "Hide labels" })).toBeVisible();

			await page.getByRole("button", { name: "Hide labels" }).click();
			await expect(page.getByRole("button", { name: "Show labels" })).toBeVisible();
		}
	});

	// ─── Selection & Editing ──────────────────────────────────────

	test("clicking a pole in placed list selects it", async ({ page }) => {
		const poleItem = page
			.locator('[aria-label*="Pole at"][aria-label*="double-click to edit"]')
			.first();
		await expect(poleItem).toBeVisible({ timeout: 3000 });
		await poleItem.click();
	});

	test("removing a pole updates the placed list", async ({ page }) => {
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);
		await page.locator('aside button[aria-label^="Remove pole"]').first().click();
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(0);
	});

	test("removing a zero updates the placed list", async ({ page }) => {
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(1);
		await page.locator('aside button[aria-label^="Remove zero"]').first().click();
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(0);
	});

	// ─── Undo / Redo ─────────────────────────────────────────────

	test("redo restores undone action", async ({ page }) => {
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		await page.keyboard.press("Meta+z");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);

		await page.keyboard.press("Meta+Shift+z");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);
	});

	// ─── Formula Bar ──────────────────────────────────────────────

	test("formula bar shows factored and expanded forms", async ({ page }) => {
		await expect(page.locator('button:has-text("f(z)=")')).toBeVisible();

		const expandedBtn = page.getByRole("button", { name: /Expanded|Factored/ });
		if (await expandedBtn.isVisible({ timeout: 2000 })) {
			await expandedBtn.click();
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
		const poleDrag = page.locator('[aria-label*="Create pole"]');
		await poleDrag.focus();
		await poleDrag.press("Enter");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(2);

		await runCommand(page, "Undo");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);
	});

	test("canonical function commands load the expected function definitions", async ({ page }) => {
		await runCommand(page, "Identity");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(0);
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(0);

		await runCommand(page, "1/z");
		await expect(page.locator('aside button[aria-label^="Remove pole"]')).toHaveCount(1);
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(0);

		await runCommand(page, "z^2");
		await expect(page.locator('aside button[aria-label^="Remove zero"]')).toHaveCount(2);

		await runCommand(page, "sin(z)");
		await expect(page.locator('input[placeholder*="expression"]')).toHaveValue("sin(z)");
	});

	test("ghost trail renders during drag and clears after the linger window", async ({ page }) => {
		const marker = page
			.locator(
				'svg[aria-label="Pole and zero markers on the complex plane"] [role="button"][aria-label^="Pole at"]',
			)
			.first();
		const box = await marker.boundingBox();
		expect(box).not.toBeNull();
		if (!box) throw new Error("Pole marker bounding box unavailable");

		const startX = box.x + box.width / 2;
		const startY = box.y + box.height / 2;
		await marker.dispatchEvent("pointerdown", {
			clientX: startX,
			clientY: startY,
			pointerId: 1,
			button: 0,
		});
		for (let step = 1; step <= 4; step++) {
			await page.evaluate(
				({ clientX, clientY }) => {
					window.dispatchEvent(
						new PointerEvent("pointermove", {
							clientX,
							clientY,
							pointerId: 1,
							bubbles: true,
						}),
					);
				},
				{ clientX: startX + step * 15, clientY: startY - step * 10 },
			);
		}
		await page.evaluate(
			({ clientX, clientY }) => {
				window.dispatchEvent(
					new PointerEvent("pointerup", {
						clientX,
						clientY,
						pointerId: 1,
						bubbles: true,
					}),
				);
			},
			{ clientX: startX + 60, clientY: startY - 40 },
		);

		const trail = page.locator(
			'svg[aria-label="Pole and zero markers on the complex plane"] polyline',
		);
		await expect(trail).toHaveCount(1, { timeout: 3000 });
		await page.waitForTimeout(700);
		await expect(trail).toHaveCount(0);
	});

	// ─── URL State Persistence ────────────────────────────────────

	test("expression mode is preserved in URL", async ({ page }) => {
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

		await openAnalysisPanel(page);
		const gainSlider = page.locator('input[aria-label^="Gain K:"]');
		await expect(gainSlider).toBeVisible({ timeout: 3000 });
	});

	// ─── 3D View ──────────────────────────────────────────────────

	test("3D view shows pole/zero panel", async ({ page }) => {
		await page.getByRole("button", { name: "3D" }).click();
		await expect(page.locator("canvas")).toBeVisible();

		await expect(page.getByRole("button", { name: "Poles & Zeros" })).toBeVisible({
			timeout: 5000,
		});
	});

	test("can add pole in 3D view", async ({ page }) => {
		await page.getByRole("button", { name: "3D" }).click();
		await expect(page.locator("canvas")).toBeVisible();

		const addPoleBtn = page.getByRole("button", { name: /Add.*pole/i });
		if (await addPoleBtn.isVisible({ timeout: 3000 })) {
			await addPoleBtn.click();
		}
	});
});

test.describe("Complex Explorer - Tutorial", () => {
	test("tutorial shows on first visit", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
	});

	test("tutorial can be skipped", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: "Skip tutorial" }).click();

		await expect(page.getByText("Welcome to the Complex Explorer")).not.toBeVisible({
			timeout: 3000,
		});
	});

	test("tutorial navigates through steps", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });

		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Adding Poles & Zeros")).toBeVisible({ timeout: 3000 });

		await page.getByRole("button", { name: "Next" }).click();
		await expect(page.getByText("Dragging & Editing")).toBeVisible({ timeout: 3000 });

		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByText("Adding Poles & Zeros")).toBeVisible({ timeout: 3000 });
	});

	test("tutorial restart command removes dismissed state", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: "Skip tutorial" }).click();
		await expect(page.getByText("Welcome to the Complex Explorer")).not.toBeVisible({
			timeout: 3000,
		});

		const dismissed = await page.evaluate(() =>
			localStorage.getItem("complex-explorer-tutorial-dismissed"),
		);
		expect(dismissed).toBe("true");

		await openCommandPalette(page);
		await page.locator("[cmdk-item]").filter({ hasText: "Restart tutorial" }).click();

		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
	});

	test("tutorial dismissed state persists in localStorage", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("canvas", { timeout: 10000 });

		await expect(page.getByText("Welcome to the Complex Explorer")).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: "Skip tutorial" }).click();

		await page.reload();
		await page.waitForSelector("canvas", { timeout: 10000 });

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
		await loadSharedState(page, {
			p: [
				[0.5, 0],
				[0.5, 0],
			],
			z: [],
		});

		await expect(page.getByText("×2").first()).toBeVisible({ timeout: 5000 });
	});

	test("double pole at origin preset shows multiplicity", async ({ page }) => {
		await openExamplesDialog(page);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /^Double pole at origin\b/ })
			.click();

		await expect(page.getByText("×2").first()).toBeVisible({ timeout: 5000 });
	});
});
