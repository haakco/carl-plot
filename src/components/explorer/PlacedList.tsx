import { useStore } from "@tanstack/react-store";
import { Circle, X } from "lucide-react";
import type { Complex } from "@/math/complex";
import { formatComplex } from "@/math/complex";
import { explorerStore, removeSingularity, setSelectedId } from "@/store/explorer-store";

function PlacedRow({ item, isSelected }: { item: Complex; isSelected: boolean }) {
	const isPole = item.type === "pole";

	return (
		<button
			type="button"
			onClick={() => setSelectedId(isSelected ? null : item.id)}
			className={`flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left transition-colors ${
				isSelected ? "ring-1 ring-ring bg-secondary" : "hover:bg-secondary/50"
			}`}
		>
			{isPole ? (
				<X className="size-3 shrink-0 text-pole" strokeWidth={2.5} />
			) : (
				<Circle className="size-3 shrink-0 text-zero" strokeWidth={2.5} />
			)}

			<span className="min-w-0 flex-1 truncate font-mono text-[12px] tabular-nums text-foreground">
				{formatComplex(item)}
			</span>

			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					removeSingularity(item.id);
				}}
				className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
				aria-label={`Remove ${item.type}`}
			>
				<X className="size-3" />
			</button>
		</button>
	);
}

export function PlacedList() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const selectedId = useStore(explorerStore, (s) => s.selectedId);

	const items = [...poles, ...zeros];

	if (items.length === 0) {
		return (
			<p className="px-1.5 text-[12px] text-muted-foreground">
				Drag a pole or zero onto the canvas
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-0.5">
			{items.map((item) => (
				<PlacedRow key={item.id} item={item} isSelected={item.id === selectedId} />
			))}
		</div>
	);
}
