import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { explorerStore, reset } from "@/store/explorer-store";
import { Toolbox } from "./Toolbox";

vi.mock("@/hooks/useToolboxDrag", () => ({
	useToolboxDrag: () => () => ({}),
}));

vi.mock("./PlacedList", () => ({
	PlacedList: () => <div>Placed list</div>,
}));

beforeEach(() => {
	reset();
});

describe("Toolbox", () => {
	const defaultProps = {
		onOpenExamples: vi.fn(),
		onToggleAnalysis: vi.fn(),
		analysisOpen: false,
	};

	it("shows Examples and Analysis buttons in poles-zeros mode", () => {
		render(<Toolbox {...defaultProps} />);

		expect(screen.getByRole("button", { name: "Examples" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Analysis" })).toBeTruthy();
	});

	it("hides Analysis button in expression mode", () => {
		explorerStore.setState((prev) => ({
			...prev,
			mode: "expression",
			expression: "sin(z)",
		}));

		render(<Toolbox {...defaultProps} />);

		expect(screen.getByRole("button", { name: "Examples" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Analysis" })).toBeNull();
	});

	it("calls onOpenExamples when Examples button is clicked", async () => {
		const onOpenExamples = vi.fn();
		render(<Toolbox {...defaultProps} onOpenExamples={onOpenExamples} />);

		fireEvent.click(screen.getByRole("button", { name: "Examples" }));
		expect(onOpenExamples).toHaveBeenCalledOnce();
	});

	it("calls onToggleAnalysis when Analysis button is clicked", async () => {
		const onToggleAnalysis = vi.fn();
		render(<Toolbox {...defaultProps} onToggleAnalysis={onToggleAnalysis} />);

		fireEvent.click(screen.getByRole("button", { name: "Analysis" }));
		expect(onToggleAnalysis).toHaveBeenCalledOnce();
	});

	it("shows Analysis button as pressed when analysisOpen is true", () => {
		render(<Toolbox {...defaultProps} analysisOpen={true} />);

		expect(screen.getByRole("button", { name: "Analysis" }).getAttribute("aria-pressed")).toBe(
			"true",
		);
	});
});
