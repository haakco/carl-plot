import { useStore } from "@tanstack/react-store";
import { Circle, X } from "lucide-react";
import { useToolboxDrag } from "@/hooks/useToolboxDrag";
import { announceToScreenReader } from "@/lib/a11y-announce";
import { addPole, addZero, explorerStore } from "@/store/explorer-store";
import { PlacedList } from "./PlacedList";

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{children}
		</h3>
	);
}

function CreateSection() {
	const poleBind = useToolboxDrag("pole");
	const zeroBind = useToolboxDrag("zero");

	return (
		<section>
			<SectionLabel>Create</SectionLabel>
			<div className="flex gap-2">
				{/* biome-ignore lint/a11y/useSemanticElements: drag source requires div for @use-gesture bindings */}
				<div
					{...poleBind()}
					style={{ touchAction: "none" }}
					className="flex flex-1 cursor-grab items-center gap-1.5 rounded-sm border border-pole-bg bg-pole-bg px-2 py-1.5 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
					role="button"
					tabIndex={0}
					aria-label="Create pole — drag onto canvas or press Enter"
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							addPole(0, 0);
							announceToScreenReader("Pole added at origin");
						}
					}}
				>
					<X className="size-3.5 text-pole" strokeWidth={2.5} aria-hidden="true" />
					<span className="text-[13px] font-medium text-foreground">Pole</span>
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: drag source requires div for @use-gesture bindings */}
				<div
					{...zeroBind()}
					style={{ touchAction: "none" }}
					className="flex flex-1 cursor-grab items-center gap-1.5 rounded-sm border border-zero-bg bg-zero-bg px-2 py-1.5 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
					role="button"
					tabIndex={0}
					aria-label="Create zero — drag onto canvas or press Enter"
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							addZero(0, 0);
							announceToScreenReader("Zero added at origin");
						}
					}}
				>
					<Circle className="size-3.5 text-zero" strokeWidth={2.5} aria-hidden="true" />
					<span className="text-[13px] font-medium text-foreground">Zero</span>
				</div>
			</div>
		</section>
	);
}

interface ToolboxProps {
	onOpenExamples: () => void;
	onToggleAnalysis: () => void;
	analysisOpen: boolean;
}

export function Toolbox({ onOpenExamples, onToggleAnalysis, analysisOpen }: ToolboxProps) {
	const mode = useStore(explorerStore, (s) => s.mode);
	const isPoleZeroMode = mode === "poles-zeros";

	return (
		<aside className="flex w-[200px] shrink-0 flex-col gap-4 overflow-y-auto border-r p-3">
			<CreateSection />

			<div className="border-t" />

			<section>
				<SectionLabel>Placed</SectionLabel>
				<PlacedList />
			</section>

			<div className="border-t" />

			<div className="flex flex-col gap-2">
				<button
					type="button"
					onClick={onOpenExamples}
					className="rounded-sm border px-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				>
					Examples
				</button>

				{isPoleZeroMode && (
					<button
						type="button"
						onClick={onToggleAnalysis}
						aria-pressed={analysisOpen}
						className={`rounded-sm border px-2 py-1.5 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
							analysisOpen
								? "border-foreground/20 bg-secondary text-foreground"
								: "text-muted-foreground hover:bg-secondary hover:text-foreground"
						}`}
					>
						Analysis
					</button>
				)}
			</div>
		</aside>
	);
}
