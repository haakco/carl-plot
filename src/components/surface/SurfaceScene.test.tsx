import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurfaceScene } from "./SurfaceScene";

let lastCanvasProps: Record<string, unknown> | null = null;

vi.mock("@react-three/fiber", () => ({
	Canvas: (props: Record<string, unknown>) => {
		lastCanvasProps = props;
		return <div data-testid="three-canvas" />;
	},
}));

vi.mock("@react-three/drei", () => ({
	OrbitControls: () => null,
}));

vi.mock("./SurfaceMesh", () => ({
	SurfaceMesh: () => null,
}));

describe("SurfaceScene", () => {
	it("preserves the drawing buffer so PNG export can read the rendered frame", () => {
		render(<SurfaceScene />);

		expect(lastCanvasProps).toMatchObject({
			gl: {
				preserveDrawingBuffer: true,
			},
		});
	});
});
