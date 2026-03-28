import { useStore } from "@tanstack/react-store";
import { Circle, X } from "lucide-react";
import { useMemo } from "react";
import { useToolboxDrag } from "@/hooks/useToolboxDrag";
import { announceToScreenReader } from "@/lib/a11y-announce";
import { formatComplex } from "@/math/complex";
import { computeAllResidues, formatResiduePlain } from "@/math/residue";
import {
	addPole,
	addZero,
	explorerStore,
	loadPreset,
	setGain,
	toggleShowAllResidues,
} from "@/store/explorer-store";
import { presets } from "@/store/presets";
import { GainSweep } from "./GainSweep";
import { ImpulseSparkline } from "./ImpulseSparkline";
import { LaplaceLens } from "./LaplaceLens";
import { NyquistPlot } from "./NyquistPlot";
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

const CATEGORY_LABELS: Record<string, string> = {
	basics: "Basics",
	filters: "Filters",
	controls: "Controls",
};

const CATEGORY_COLORS: Record<string, string> = {
	basics: "oklch(0.7 0.12 250)",
	filters: "oklch(0.7 0.12 145)",
	controls: "oklch(0.7 0.12 35)",
};

function ExamplesSection() {
	const grouped = useMemo(() => {
		const map = new Map<string, typeof presets>();
		for (const preset of presets) {
			const list = map.get(preset.category) ?? [];
			list.push(preset);
			map.set(preset.category, list);
		}
		return map;
	}, []);

	return (
		<section>
			<SectionLabel>Examples</SectionLabel>
			<div className="flex flex-col gap-2">
				{[...grouped.entries()].map(([category, categoryPresets]) => (
					<div key={category} className="flex flex-col gap-0.5">
						<span
							className="text-[10px] font-medium uppercase tracking-wider"
							style={{ color: CATEGORY_COLORS[category] }}
						>
							{CATEGORY_LABELS[category] ?? category}
						</span>
						{categoryPresets.map((preset) => (
							<button
								key={preset.name}
								type="button"
								onClick={() => loadPreset(preset)}
								className="group rounded-sm px-1.5 py-1 text-left transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
							>
								<span className="block text-[12px] text-muted-foreground group-hover:text-foreground">
									{preset.name}
								</span>
								<span className="block text-[10px] leading-tight text-muted-foreground/60">
									{preset.description}
								</span>
							</button>
						))}
					</div>
				))}
			</div>
		</section>
	);
}

function ResidueSection() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);
	const showAll = useStore(explorerStore, (s) => s.showAllResidues);

	const residues = useMemo(() => {
		if (poles.length === 0) return null;
		return computeAllResidues(poles, zeros, gain);
	}, [poles, zeros, gain]);

	if (!residues || poles.length === 0) return null;

	return (
		<section>
			<div className="flex items-center justify-between pb-1.5">
				<SectionLabel>Residues</SectionLabel>
				<button
					type="button"
					onClick={toggleShowAllResidues}
					className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
				>
					{showAll ? "Hide labels" : "Show labels"}
				</button>
			</div>
			<div className="flex flex-col gap-0.5">
				{poles.map((pole) => {
					const result = residues.get(pole.id);
					if (!result) return null;
					return (
						<div
							key={pole.id}
							className="flex items-center justify-between rounded-sm px-1 py-0.5 font-mono text-[11px] text-muted-foreground"
						>
							<span className="truncate">{formatComplex(pole)}</span>
							<span className="ml-1 shrink-0 text-foreground">{formatResiduePlain(result)}</span>
						</div>
					);
				})}
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

			<ExamplesSection />

			{isPoleZeroMode && (
				<>
					<div className="border-t" />

					<ResidueSection />

					<div className="border-t" />

					<section>
						<ImpulseSparkline />
					</section>

					<div className="border-t" />

					<section>
						<NyquistPlot />
					</section>

					<div className="border-t" />

					<section>
						<LaplaceLens />
					</section>
				</>
			)}

			<div className="border-t" />

			<ControlsSection />

			{isPoleZeroMode && (
				<>
					<div className="border-t" />

					<section>
						<SectionLabel>Gain Sweep</SectionLabel>
						<GainSweep />
					</section>
				</>
			)}
		</aside>
	);
}
