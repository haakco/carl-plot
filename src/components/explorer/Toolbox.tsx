import { useStore } from "@tanstack/react-store";
import { Circle, X } from "lucide-react";
import { useToolboxDrag } from "@/hooks/useToolboxDrag";
import { announceToScreenReader } from "@/lib/a11y-announce";
import { addPole, addZero, explorerStore, loadPreset, setGain } from "@/store/explorer-store";
import { presets } from "@/store/presets";
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

function ExamplesSection() {
	return (
		<section>
			<SectionLabel>Examples</SectionLabel>
			<div className="flex flex-col gap-0.5">
				{presets.map((preset) => (
					<button
						key={preset.name}
						type="button"
						onClick={() => loadPreset(preset)}
						title={preset.description}
						className="rounded-sm px-1.5 py-1 text-left text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
					>
						{preset.name}
					</button>
				))}
			</div>
		</section>
	);
}

function ControlsSection() {
	const gain = useStore(explorerStore, (s) => s.gain);

	return (
		<section>
			<SectionLabel>Controls</SectionLabel>
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-[12px] text-muted-foreground">Gain (K)</span>
					<span className="font-mono text-[12px] tabular-nums text-foreground">
						{gain.toFixed(2)}
					</span>
				</div>
				<input
					type="range"
					min={0.01}
					max={10}
					step={0.01}
					value={gain}
					onChange={(event) => setGain(Number.parseFloat(event.target.value))}
					aria-label={`Gain K: ${gain.toFixed(2)}`}
					className="h-1.5 w-full cursor-pointer accent-foreground"
				/>
			</div>
		</section>
	);
}

export function Toolbox() {
	return (
		<aside className="flex w-[200px] shrink-0 flex-col gap-4 overflow-y-auto border-r p-3">
			<CreateSection />

			<div className="border-t" />

			<section>
				<SectionLabel>Placed</SectionLabel>
				<PlacedList />
			</section>

			<div className="border-t" />

			<ExamplesSection />

			<div className="border-t" />

			<ControlsSection />
		</aside>
	);
}
