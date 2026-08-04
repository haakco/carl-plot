import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { explorerStore, reset } from "@/store/explorer-store";
import { ConformalGrid } from "./ConformalGrid";

beforeEach(() => {
	reset();
});

describe("ConformalGrid mode guard", () => {
	it("renders the grid in poles-zeros mode when enabled", () => {
		explorerStore.setState((prev) => ({
			...prev,
			showConformalGrid: true,
		}));

		render(<ConformalGrid width={300} height={200} />);

		expect(
			screen.getByLabelText(
				"Conformal mapping grid showing how the transfer function deforms the complex plane",
			),
		).toBeTruthy();
	});

	it("hides the grid in expression mode even when the toggle is enabled", () => {
		explorerStore.setState((prev) => ({
			...prev,
			mode: "expression",
			expression: "sin(z)",
			showConformalGrid: true,
		}));

		render(<ConformalGrid width={300} height={200} />);

		expect(
			screen.queryByLabelText(
				"Conformal mapping grid showing how the transfer function deforms the complex plane",
			),
		).toBeNull();
	});
});
