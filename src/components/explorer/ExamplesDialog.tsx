import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { useDraggablePanel } from "@/hooks/useDraggablePanel";
import { applyExplorerExample, examples } from "@/store/examples";
import type { PresetCategory } from "@/store/presets";
import { ExampleThumbnail } from "./ExampleThumbnail";

const CATEGORY_LABELS: Record<PresetCategory, string> = {
	basics: "Basics",
	filters: "Filters",
	controls: "Controls",
};

const CATEGORY_COLORS: Record<PresetCategory, string> = {
	basics: "oklch(0.7 0.12 250)",
	filters: "oklch(0.7 0.12 145)",
	controls: "oklch(0.7 0.12 35)",
};

const ALL_CATEGORIES: PresetCategory[] = ["basics", "filters", "controls"];

interface ExamplesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ExamplesDialog({ open, onOpenChange }: ExamplesDialogProps) {
	const [activeCategory, setActiveCategory] = useState<PresetCategory | "all">("all");
	const { dragStyle, onDragStart } = useDraggablePanel();

	const grouped = useMemo(() => {
		const map = new Map<PresetCategory, typeof examples>();
		for (const example of examples) {
			const list = map.get(example.category) ?? [];
			list.push(example);
			map.set(example.category, list);
		}
		return map;
	}, []);

	const filteredExamples = useMemo(() => {
		if (activeCategory === "all") return examples;
		return grouped.get(activeCategory) ?? [];
	}, [activeCategory, grouped]);

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
				<Dialog.Content
					className="fixed top-1/2 left-1/2 z-50 w-[520px] max-w-[90vw] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background shadow-xl overflow-hidden flex flex-col"
					style={dragStyle}
				>
					{/* biome-ignore lint/a11y/useSemanticElements: drag handle for dialog title bar */}
					<div
						className="flex items-center justify-between border-b px-4 py-3 cursor-grab active:cursor-grabbing select-none"
						onPointerDown={onDragStart}
						role="toolbar"
						aria-label="Drag to reposition"
					>
						<Dialog.Title className="text-sm font-medium text-foreground">Examples</Dialog.Title>
						<Dialog.Close className="text-muted-foreground hover:text-foreground text-xs px-1">
							✕
						</Dialog.Close>
					</div>

					{/* Category tabs */}
					<div className="flex gap-1 border-b px-4 py-2">
						<button
							type="button"
							onClick={() => setActiveCategory("all")}
							className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors ${
								activeCategory === "all"
									? "bg-secondary text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							All
						</button>
						{ALL_CATEGORIES.map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => setActiveCategory(cat)}
								className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors ${
									activeCategory === cat
										? "bg-secondary text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
								style={
									activeCategory === cat
										? { borderBottom: `2px solid ${CATEGORY_COLORS[cat]}` }
										: undefined
								}
							>
								{CATEGORY_LABELS[cat]}
							</button>
						))}
					</div>

					{/* Examples grid */}
					<div className="overflow-y-auto p-4">
						<div className="grid grid-cols-2 gap-3">
							{filteredExamples.map((example) => (
								<button
									key={example.name}
									type="button"
									onClick={() => {
										applyExplorerExample(example);
										onOpenChange(false);
									}}
									aria-label={example.name}
									className="group rounded-md border border-border/70 bg-card/60 p-2.5 text-left transition-colors hover:border-border hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"
								>
									<ExampleThumbnail example={example} />
									{activeCategory === "all" && (
										<span
											className="mt-1.5 inline-block rounded-sm px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider"
											style={{
												color: CATEGORY_COLORS[example.category],
												backgroundColor: `color-mix(in oklch, ${CATEGORY_COLORS[example.category]} 15%, transparent)`,
											}}
										>
											{CATEGORY_LABELS[example.category]}
										</span>
									)}
									<span className="mt-1 block text-[12px] font-medium text-foreground">
										{example.name}
									</span>
									<span className="block text-[10px] leading-tight text-muted-foreground/70">
										{example.description}
									</span>
								</button>
							))}
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
