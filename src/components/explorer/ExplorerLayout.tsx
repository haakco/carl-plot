import { useStore } from "@tanstack/react-store";
import { CommandMenu } from "@/components/common/CommandMenu";
import { explorerStore } from "@/store/explorer-store";
import { Canvas2D } from "./Canvas2D";
import { Canvas3D } from "./Canvas3D";
import { CoordReadout } from "./CoordReadout";
import { FormulaBar } from "./FormulaBar";
import { Toolbox } from "./Toolbox";
import { TopBar } from "./TopBar";

export function ExplorerLayout() {
	const viewMode = useStore(explorerStore, (s) => s.viewMode);

	return (
		<div className="flex h-screen w-screen flex-col bg-background text-foreground">
			<TopBar />

			<div className="flex min-h-0 flex-1">
				<Toolbox />

				<main className="relative min-w-0 flex-1">
					{viewMode === "2d" ? <Canvas2D /> : <Canvas3D />}
					{viewMode === "2d" && <CoordReadout />}
				</main>
			</div>

			<FormulaBar />
			<CommandMenu />
		</div>
	);
}
