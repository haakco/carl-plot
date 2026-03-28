import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { CommandMenu } from "@/components/common/CommandMenu";
import { announceToScreenReader, subscribeAnnouncer } from "@/lib/a11y-announce";
import { decodeStateFromUrl, encodeStateToUrl } from "@/lib/url-state";
import {
	explorerStore,
	moveSingularity,
	redo,
	removeSingularity,
	setSelectedId,
	undo,
} from "@/store/explorer-store";
import { Canvas2D } from "./Canvas2D";
import { Canvas3D } from "./Canvas3D";
import { CoordReadout } from "./CoordReadout";
import { FormulaBar } from "./FormulaBar";
import { PoleZeroPanel } from "./PoleZeroPanel";
import { Toolbox } from "./Toolbox";
import { TopBar } from "./TopBar";

function A11yAnnouncer() {
	const [message, setMessage] = useState("");

	useEffect(() => {
		return subscribeAnnouncer((msg) => {
			// Clear then set to ensure repeat announcements are picked up
			setMessage("");
			requestAnimationFrame(() => setMessage(msg));
		});
	}, []);

	return (
		<div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
			{message}
		</div>
	);
}

export function ExplorerLayout() {
	const viewMode = useStore(explorerStore, (s) => s.viewMode);
	const hasInitialized = useRef(false);

	useHotkeys("delete, backspace", () => {
		const { selectedId } = explorerStore.state;
		if (selectedId) removeSingularity(selectedId);
	});

	useHotkeys("escape", () => {
		const { selectedId } = explorerStore.state;
		if (selectedId) {
			setSelectedId(null);
			announceToScreenReader("Deselected");
		}
	});

	const nudgeSelected = useCallback((dRe: number, dIm: number) => {
		const { selectedId, poles, zeros } = explorerStore.state;
		if (!selectedId) return;
		const item = poles.find((p) => p.id === selectedId) ?? zeros.find((z) => z.id === selectedId);
		if (!item) return;
		moveSingularity(selectedId, item.re + dRe, item.im + dIm);
	}, []);

	useHotkeys("up", (e) => {
		e.preventDefault();
		nudgeSelected(0, e.shiftKey ? 0.01 : 0.1);
	});
	useHotkeys("down", (e) => {
		e.preventDefault();
		nudgeSelected(0, e.shiftKey ? -0.01 : -0.1);
	});
	useHotkeys("left", (e) => {
		e.preventDefault();
		nudgeSelected(e.shiftKey ? -0.01 : -0.1, 0);
	});
	useHotkeys("right", (e) => {
		e.preventDefault();
		nudgeSelected(e.shiftKey ? 0.01 : 0.1, 0);
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

		let timer: ReturnType<typeof setTimeout> | null = null;
		const subscription = explorerStore.subscribe(() => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				encodeStateToUrl();
				timer = null;
			}, 300);
		});
		return () => {
			if (timer) clearTimeout(timer);
			subscription.unsubscribe();
		};
	}, []);

	return (
		<div className="flex h-screen w-screen flex-col bg-background text-foreground">
			<TopBar />

			<div className="flex min-h-0 flex-1">
				<Toolbox />

				<main className="relative min-w-0 flex-1" aria-label="Complex plane visualization">
					{viewMode === "2d" ? <Canvas2D /> : <Canvas3D />}
					{viewMode === "2d" && <CoordReadout />}
					{viewMode === "3d" && <PoleZeroPanel />}
				</main>
			</div>

			<FormulaBar />
			<CommandMenu />

			{/* Screen reader announcements for pole/zero events */}
			<A11yAnnouncer />
		</div>
	);
}
