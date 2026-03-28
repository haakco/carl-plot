import { useStore } from "@tanstack/react-store";
import { explorerStore, setViewMode } from "@/store/explorer-store";
import { SettingsPanel } from "./SettingsPanel";

export function TopBar() {
	const viewMode = useStore(explorerStore, (s) => s.viewMode);

	return (
		<header className="flex h-10 shrink-0 items-center justify-between border-b px-3">
			<span className="font-sans text-[13px] font-medium text-foreground">Complex Explorer</span>

			{/* biome-ignore lint/a11y/useSemanticElements: segmented control needs role="group" */}
			<div
				className="flex items-center gap-0.5 rounded-sm border p-0.5"
				role="group"
				aria-label="View mode"
			>
				<button
					type="button"
					onClick={() => setViewMode("2d")}
					aria-pressed={viewMode === "2d"}
					className={`rounded-sm px-2 py-0.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
						viewMode === "2d"
							? "bg-secondary text-secondary-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					2D
				</button>
				<button
					type="button"
					onClick={() => setViewMode("3d")}
					aria-pressed={viewMode === "3d"}
					className={`rounded-sm px-2 py-0.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
						viewMode === "3d"
							? "bg-secondary text-secondary-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					3D
				</button>
			</div>

			<div className="flex items-center gap-2">
				<SettingsPanel />
				<kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
					⌘K
				</kbd>
			</div>
		</header>
	);
}
