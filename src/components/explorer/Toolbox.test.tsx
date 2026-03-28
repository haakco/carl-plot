import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { explorerStore, reset } from "@/store/explorer-store";
import { Toolbox } from "./Toolbox";

vi.mock("@/hooks/useToolboxDrag", () => ({
	useToolboxDrag: () => () => ({}),
}));

vi.mock("./PlacedList", () => ({
	PlacedList: () => <div>Placed list</div>,
}));

vi.mock("./ImpulseSparkline", () => ({
	ImpulseSparkline: () => <div>h[n] impulse response</div>,
}));

vi.mock("./NyquistPlot", () => ({
	NyquistPlot: () => <div>Nyquist plot</div>,
}));

vi.mock("./LaplaceLens", () => ({
	LaplaceLens: () => <div>Laplace lens</div>,
}));

vi.mock("./GainSweep", () => ({
	GainSweep: () => <div>Gain sweep</div>,
}));

beforeEach(() => {
	reset();
});

describe("Toolbox", () => {
	it("shows pole-zero analysis panels in poles-zeros mode", () => {
		render(<Toolbox />);

		expect(screen.getByText("Residues")).toBeTruthy();
		expect(screen.getByText("h[n] impulse response")).toBeTruthy();
		expect(screen.getByText("Nyquist plot")).toBeTruthy();
		expect(screen.getByText("Laplace lens")).toBeTruthy();
		expect(screen.getByText("Gain sweep")).toBeTruthy();
	});

	it("hides pole-zero analysis panels in expression mode", () => {
		explorerStore.setState((prev) => ({
			...prev,
			mode: "expression",
			expression: "sin(z)",
		}));

		render(<Toolbox />);

		expect(screen.queryByText("Residues")).toBeNull();
		expect(screen.queryByText("h[n] impulse response")).toBeNull();
		expect(screen.queryByText("Nyquist plot")).toBeNull();
		expect(screen.queryByText("Laplace lens")).toBeNull();
		expect(screen.queryByText("Gain sweep")).toBeNull();
	});
});
