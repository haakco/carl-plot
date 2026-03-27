import { useStore } from "@tanstack/react-store";
import { useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { CommandMenu } from "@/components/common/CommandMenu";
import { decodeStateFromUrl, encodeStateToUrl } from "@/lib/url-state";
import { explorerStore, redo, removeSingularity, undo } from "@/store/explorer-store";
import { Canvas2D } from "./Canvas2D";
import { Canvas3D } from "./Canvas3D";
import { CoordReadout } from "./CoordReadout";
import { FormulaBar } from "./FormulaBar";
import { Toolbox } from "./Toolbox";
import { TopBar } from "./TopBar";

export function ExplorerLayout() {
	const viewMode = useStore(explorerStore, (s) => s.viewMode);
	const hasInitialized = useRef(false);

	useHotkeys("delete, backspace", () => {
		const { selectedId } = explorerStore.state;
		if (selectedId) removeSingularity(selectedId);
	});

	useHotkeys("mod+z", (e) => {
		e.preventDefault();
		undo();
	});

	useHotkeys("mod+shift+z", (e) => {
		e.preventDefault();
		redo();
	});

	useEffect(() => {
		if (!hasInitialized.current) {
			hasInitialized.current = true;
			decodeStateFromUrl();
		}

		const subscription = explorerStore.subscribe(() => {
			encodeStateToUrl();
		});
		return () => subscription.unsubscribe();
	}, []);

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
