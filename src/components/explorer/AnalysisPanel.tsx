import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { formatComplex } from "@/math/complex";
import { computeAllResidues, formatResiduePlain } from "@/math/residue";
import { explorerStore, setGain, toggleShowAllResidues } from "@/store/explorer-store";
import { GainSweep } from "./GainSweep";
import { ImpulseSparkline } from "./ImpulseSparkline";
import { LaplaceLens } from "./LaplaceLens";
import { NyquistPlot } from "./NyquistPlot";

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
			{children}
		</h3>
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
		<div>
			<div className="flex items-center justify-between pb-1">
				<SectionLabel>Residues</SectionLabel>
				<button
					type="button"
					onClick={toggleShowAllResidues}
					className="rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
							className="flex items-center justify-between rounded-sm px-1 py-0.5 font-mono text-[10px] text-muted-foreground"
						>
							<span className="truncate">{formatComplex(pole)}</span>
							<span className="ml-1 shrink-0 text-foreground">{formatResiduePlain(result)}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function GainControl() {
	const gain = useStore(explorerStore, (s) => s.gain);

	return (
		<div>
			<SectionLabel>Controls</SectionLabel>
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-[11px] text-muted-foreground">Gain (K)</span>
					<span className="font-mono text-[11px] tabular-nums text-foreground">
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
		</div>
	);
}

interface AnalysisPanelProps {
	open: boolean;
	onClose: () => void;
}

export function AnalysisPanel({ open, onClose }: AnalysisPanelProps) {
	const mode = useStore(explorerStore, (s) => s.mode);
	const isPoleZeroMode = mode === "poles-zeros";

	if (!open) return null;

	return (
		<section
			className="absolute right-3 bottom-3 z-30 flex w-[220px] flex-col gap-3 rounded-lg border border-border bg-background/95 p-3 shadow-xl backdrop-blur-sm"
			aria-label="Analysis panel"
		>
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-medium text-foreground">Analysis</span>
				<button
					type="button"
					onClick={onClose}
					className="text-muted-foreground hover:text-foreground text-xs px-1"
					aria-label="Close analysis panel"
				>
					✕
				</button>
			</div>

			{isPoleZeroMode && (
				<>
					<ResidueSection />
					<div className="border-t" />
					<ImpulseSparkline />
					<div className="border-t" />
					<NyquistPlot />
					<div className="border-t" />
					<LaplaceLens />
				</>
			)}

			<div className="border-t" />
			<GainControl />

			{isPoleZeroMode && (
				<>
					<div className="border-t" />
					<div>
						<SectionLabel>Gain Sweep</SectionLabel>
						<GainSweep />
					</div>
				</>
			)}
		</section>
	);
}
