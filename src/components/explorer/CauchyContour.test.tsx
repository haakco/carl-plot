import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createComplex } from "@/math/complex";
import { explorerStore, reset } from "@/store/explorer-store";
import { CauchyContour } from "./CauchyContour";

beforeEach(() => {
	reset();
});

describe("CauchyContour", () => {
	it("hides the contour in expression mode", () => {
		explorerStore.setState((prev) => ({
			...prev,
			mode: "expression",
			expression: "sin(z)",
			cauchyContour: true,
		}));

		render(<CauchyContour width={300} height={200} />);

		expect(screen.queryByLabelText("Cauchy integral contour on the complex plane")).toBeNull();
	});

	it("reports repeated-pole integrals as unavailable instead of NaN", () => {
		explorerStore.setState((prev) => ({
			...prev,
			cauchyContour: true,
			cauchyCenter: { re: 0.5, im: 0 },
			cauchyRadius: 1,
			poles: [createComplex("pole", 0.5, 0), createComplex("pole", 0.5, 0)],
			zeros: [],
		}));

		render(<CauchyContour width={300} height={200} />);

		expect(screen.getByText(/\u222e f\(z\)dz = unavailable \(repeated poles\)/)).toBeTruthy();
	});
});
