import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { explorerStore, reset } from "@/store/explorer-store";
import { CoordReadout } from "./CoordReadout";

beforeEach(() => {
	reset();
});

describe("CoordReadout", () => {
	it("evaluates the active expression instead of stale poles/zeros in expression mode", () => {
		explorerStore.setState((prev) => ({
			...prev,
			mode: "expression",
			expression: "z^2",
			cursorZ: { re: 0, im: 1 },
		}));

		render(<CoordReadout />);

		expect(screen.getByText("f(z) = -1.00 + 0.00i")).toBeTruthy();
		expect(screen.getByText("|f(z)| = 1.00")).toBeTruthy();
	});
});
