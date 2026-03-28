import { useCallback, useState } from "react";

interface TutorialStep {
	title: string;
	body: string;
}

const STEPS: TutorialStep[] = [
	{
		title: "Welcome to the Complex Explorer",
		body: "This tool visualizes complex-valued transfer functions using domain coloring. Poles (×) and zeros (○) define the function H(z).",
	},
	{
		title: "Adding Poles & Zeros",
		body: "Drag a Pole or Zero from the sidebar onto the canvas. Or click a preset in the Examples section to load a predefined system.",
	},
	{
		title: "Dragging & Editing",
		body: "Click and drag any marker to move it. The domain coloring updates in real time. A ghost trail shows where the marker has been.",
	},
	{
		title: "Stability & the Unit Circle",
		body: "For discrete-time systems, poles inside the unit circle mean stability (green glow). On the circle means marginal (yellow pulse). Outside means unstable (red).",
	},
	{
		title: "Reading the Colors",
		body: "The background uses domain coloring: hue = phase of H(z), brightness = magnitude. Bright spots are near zeros, dark spots near poles.",
	},
	{
		title: "Impulse Response & Nyquist",
		body: "The sidebar shows h[n] impulse response and a Nyquist plot with gain/phase margins. These update live as you move markers.",
	},
	{
		title: "Gain Sweep & Conformal Grid",
		body: "Use the Gain Sweep to animate how the system changes with gain. Toggle the conformal grid (Cmd+K → 'conformal') to see how f(z) deforms space.",
	},
	{
		title: "Keyboard Shortcuts",
		body: "Cmd+K opens the command palette. Cmd+Z/Shift+Cmd+Z for undo/redo. Arrow keys nudge the selected marker. Delete removes it.",
	},
];

const STORAGE_KEY = "complex-explorer-tutorial-dismissed";

function isDismissed(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

function setDismissed(): void {
	try {
		localStorage.setItem(STORAGE_KEY, "true");
	} catch {
		// ignore
	}
}

export function Tutorial() {
	const [visible, setVisible] = useState(!isDismissed());
	const [step, setStep] = useState(0);

	const handleDismiss = useCallback(() => {
		setVisible(false);
		setDismissed();
	}, []);

	const handleNext = useCallback(() => {
		if (step < STEPS.length - 1) {
			setStep((s) => s + 1);
		} else {
			handleDismiss();
		}
	}, [step, handleDismiss]);

	const handlePrev = useCallback(() => {
		setStep((s) => Math.max(0, s - 1));
	}, []);

	if (!visible) return null;

	const current = STEPS[step];
	const isLast = step === STEPS.length - 1;

	return (
		<div className="absolute bottom-4 left-1/2 z-40 w-full max-w-sm -translate-x-1/2">
			<div className="rounded-lg border bg-popover/95 p-4 shadow-lg backdrop-blur-sm">
				<div className="mb-1 flex items-center justify-between">
					<span className="text-[11px] font-medium text-muted-foreground">
						Step {step + 1} of {STEPS.length}
					</span>
					<button
						type="button"
						onClick={handleDismiss}
						className="text-[11px] text-muted-foreground hover:text-foreground"
					>
						Skip tutorial
					</button>
				</div>
				<h4 className="mb-1 text-[13px] font-semibold text-foreground">{current.title}</h4>
				<p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">{current.body}</p>
				<div className="flex items-center justify-between">
					<div className="flex gap-1">
						{STEPS.map((_, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed step count
								key={`dot-${i}`}
								className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-foreground" : "bg-muted-foreground/30"}`}
							/>
						))}
					</div>
					<div className="flex gap-1.5">
						{step > 0 && (
							<button
								type="button"
								onClick={handlePrev}
								className="rounded border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
							>
								Back
							</button>
						)}
						<button
							type="button"
							onClick={handleNext}
							className="rounded border bg-foreground px-2 py-1 text-[11px] text-background hover:bg-foreground/90"
						>
							{isLast ? "Done" : "Next"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
