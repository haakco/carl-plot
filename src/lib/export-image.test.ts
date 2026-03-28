import { describe, expect, it, vi } from "vitest";
import { exportCanvasToPng } from "./export-image";

describe("exportCanvasToPng", () => {
	it("does nothing when no main element exists", () => {
		// No main element in jsdom by default
		expect(() => exportCanvasToPng()).not.toThrow();
	});

	it("does nothing when main has no canvas", () => {
		const main = document.createElement("main");
		main.setAttribute("aria-label", "Complex plane visualization");
		document.body.appendChild(main);

		expect(() => exportCanvasToPng()).not.toThrow();

		document.body.removeChild(main);
	});

	it("calls toBlob on the canvas when found", () => {
		const main = document.createElement("main");
		main.setAttribute("aria-label", "Complex plane visualization");
		const canvas = document.createElement("canvas");
		const mockToBlob = vi.fn();
		canvas.toBlob = mockToBlob;
		main.appendChild(canvas);
		document.body.appendChild(main);

		exportCanvasToPng("test-export.png");

		expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");

		document.body.removeChild(main);
	});

	it("uses timestamp-based filename when none provided", () => {
		const main = document.createElement("main");
		main.setAttribute("aria-label", "Complex plane visualization");
		const canvas = document.createElement("canvas");

		let capturedCallback: ((blob: Blob | null) => void) | undefined;
		canvas.toBlob = vi.fn((cb) => {
			capturedCallback = cb;
		});
		main.appendChild(canvas);
		document.body.appendChild(main);

		const createElementSpy = vi.spyOn(document, "createElement");

		exportCanvasToPng();

		// Simulate blob callback
		const blob = new Blob(["fake"], { type: "image/png" });
		capturedCallback?.(blob);

		// Check that an <a> element was created for download
		const linkCalls = createElementSpy.mock.results.filter(
			(r) => r.type === "return" && (r.value as HTMLElement).tagName === "A",
		);
		expect(linkCalls.length).toBeGreaterThan(0);

		const link = linkCalls[linkCalls.length - 1].value as HTMLAnchorElement;
		expect(link.download).toMatch(/^complex-explorer-\d+\.png$/);

		createElementSpy.mockRestore();
		document.body.removeChild(main);
	});
});
