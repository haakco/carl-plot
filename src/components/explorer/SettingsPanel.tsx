import { useStore } from "@tanstack/react-store";
import { Settings } from "lucide-react";
import { useState } from "react";
import {
	explorerStore,
	toggleEnforceConjugates,
	toggleGrid,
	toggleModContours,
	togglePhaseContours,
} from "@/store/explorer-store";

function setContourDensity(density: number): void {
	explorerStore.setState((prev) => ({ ...prev, contourDensity: density }));
}

function ToggleRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<label className="flex cursor-pointer items-center justify-between py-0.5">
			<span className="text-[12px] text-muted-foreground">{label}</span>
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				className="size-3.5 cursor-pointer accent-foreground"
			/>
		</label>
	);
}

export function SettingsPanel() {
	const [isOpen, setIsOpen] = useState(false);
	const enforceConjugates = useStore(explorerStore, (s) => s.enforceConjugates);
	const showModContours = useStore(explorerStore, (s) => s.showModContours);
	const showPhaseContours = useStore(explorerStore, (s) => s.showPhaseContours);
	const showGrid = useStore(explorerStore, (s) => s.showGrid);
	const contourDensity = useStore(explorerStore, (s) => s.contourDensity);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
				aria-label="Toggle settings panel"
			>
				<Settings className="size-4" />
			</button>

			{isOpen && (
				<div className="absolute top-full right-0 z-50 mt-1 w-56 rounded-md border bg-background p-3 shadow-md">
					<h4 className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Display
					</h4>

					<div className="flex flex-col gap-1">
						<ToggleRow
							label="Conjugate pairs"
							checked={enforceConjugates}
							onChange={toggleEnforceConjugates}
						/>
						<ToggleRow
							label="Modulus contours"
							checked={showModContours}
							onChange={toggleModContours}
						/>
						<ToggleRow
							label="Phase contours"
							checked={showPhaseContours}
							onChange={togglePhaseContours}
						/>
						<ToggleRow label="Grid lines" checked={showGrid} onChange={toggleGrid} />
					</div>

					<div className="mt-3 border-t pt-3">
						<div className="flex items-center justify-between">
							<span className="text-[12px] text-muted-foreground">Contour density</span>
							<span className="font-mono text-[12px] tabular-nums text-foreground">
								{contourDensity.toFixed(1)}
							</span>
						</div>
						<input
							type="range"
							min={0.5}
							max={4}
							step={0.1}
							value={contourDensity}
							onChange={(e) => setContourDensity(Number.parseFloat(e.target.value))}
							className="mt-1 h-1.5 w-full cursor-pointer accent-foreground"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
