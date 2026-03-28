import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { exportCanvasToPng } from "@/lib/export-image";
import {
	clearAll,
	loadPreset,
	redo,
	resetView,
	setViewMode,
	toggleConformalGrid,
	toggleGrid,
	toggleModContours,
	togglePhaseContours,
	toggleShowAllResidues,
	undo,
} from "@/store/explorer-store";
import { presets } from "@/store/presets";

export function CommandMenu() {
	const [open, setOpen] = useState(false);

	useHotkeys("mod+k", (event) => {
		event.preventDefault();
		setOpen((prev) => !prev);
	});

	const runAndClose = useCallback((action: () => void) => {
		action();
		setOpen(false);
	}, []);

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
				<Dialog.Content className="fixed left-1/2 top-[20%] z-50 w-full max-w-md -translate-x-1/2 rounded-[6px] border bg-popover shadow-lg">
					<Command className="flex flex-col" loop>
						<Command.Input
							placeholder="Type a command..."
							className="w-full border-b bg-transparent px-3 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
						/>
						<Command.List className="max-h-72 overflow-y-auto p-1.5">
							<Command.Empty className="px-3 py-4 text-center text-[13px] text-muted-foreground">
								No results found.
							</Command.Empty>

							<Command.Group
								heading="View"
								className="px-1 pb-1 text-[11px] font-medium text-muted-foreground"
							>
								<CommandItem onSelect={() => runAndClose(resetView)} shortcut="Ctrl+0">
									Reset view
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(() => setViewMode("2d"))}>
									Switch to 2D
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(() => setViewMode("3d"))}>
									Switch to 3D
								</CommandItem>
							</Command.Group>

							<Command.Separator className="mx-1 my-1 h-px bg-border" />

							<Command.Group
								heading="Display"
								className="px-1 pb-1 text-[11px] font-medium text-muted-foreground"
							>
								<CommandItem onSelect={() => runAndClose(toggleModContours)}>
									Toggle contour lines
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(toggleGrid)}>Toggle grid</CommandItem>
								<CommandItem onSelect={() => runAndClose(togglePhaseContours)}>
									Toggle phase contours
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(toggleShowAllResidues)}>
									Toggle residue labels
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(toggleConformalGrid)}>
									Toggle conformal grid
								</CommandItem>
							</Command.Group>

							<Command.Separator className="mx-1 my-1 h-px bg-border" />

							<Command.Group
								heading="Presets"
								className="px-1 pb-1 text-[11px] font-medium text-muted-foreground"
							>
								{presets.map((preset) => (
									<CommandItem
										key={preset.name}
										onSelect={() => runAndClose(() => loadPreset(preset))}
									>
										{preset.name}
									</CommandItem>
								))}
							</Command.Group>

							<Command.Separator className="mx-1 my-1 h-px bg-border" />

							<Command.Group
								heading="Export"
								className="px-1 pb-1 text-[11px] font-medium text-muted-foreground"
							>
								<CommandItem onSelect={() => runAndClose(exportCanvasToPng)}>
									Export as PNG
								</CommandItem>
							</Command.Group>

							<Command.Separator className="mx-1 my-1 h-px bg-border" />

							<Command.Group
								heading="Edit"
								className="px-1 pb-1 text-[11px] font-medium text-muted-foreground"
							>
								<CommandItem onSelect={() => runAndClose(clearAll)}>
									Clear all poles/zeros
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(undo)} shortcut="Ctrl+Z">
									Undo
								</CommandItem>
								<CommandItem onSelect={() => runAndClose(redo)} shortcut="Ctrl+Shift+Z">
									Redo
								</CommandItem>
							</Command.Group>

							<Command.Separator className="mx-1 my-1 h-px bg-border" />

							<Command.Group
								heading="Help"
								className="px-1 pb-1 text-[11px] font-medium text-muted-foreground"
							>
								<CommandItem
									onSelect={() =>
										runAndClose(() => {
											try {
												localStorage.removeItem("complex-explorer-tutorial-dismissed");
												window.location.reload();
											} catch {
												// ignore
											}
										})
									}
								>
									Restart tutorial
								</CommandItem>
							</Command.Group>
						</Command.List>
					</Command>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function CommandItem({
	children,
	onSelect,
	shortcut,
}: {
	children: React.ReactNode;
	onSelect: () => void;
	shortcut?: string;
}) {
	return (
		<Command.Item
			onSelect={onSelect}
			className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] text-foreground data-[selected=true]:bg-secondary"
		>
			<span>{children}</span>
			{shortcut && (
				<kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
					{shortcut}
				</kbd>
			)}
		</Command.Item>
	);
}
