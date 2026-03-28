import { useStore } from "@tanstack/react-store";
import { Circle, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { moveWithConjugate, parseCoordinate } from "@/lib/singularity-helpers";
import type { Complex } from "@/math/complex";
import { formatComplex } from "@/math/complex";
import { explorerStore, removeSingularity, setSelectedId } from "@/store/explorer-store";

function EditableValue({ item, isSelected }: { item: Complex; isSelected: boolean }) {
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const startEditing = useCallback(() => {
		setEditValue(formatComplex(item));
		setEditing(true);
		setTimeout(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		}, 0);
	}, [item]);

	const commitEdit = useCallback(() => {
		const parsed = parseCoordinate(editValue);
		if (parsed) {
			moveWithConjugate(item.id, parsed);
		}
		setEditing(false);
	}, [editValue, item.id]);

	if (editing) {
		return (
			<input
				ref={inputRef}
				type="text"
				value={editValue}
				onChange={(e) => setEditValue(e.target.value)}
				onBlur={commitEdit}
				onKeyDown={(e) => {
					if (e.key === "Enter") commitEdit();
					if (e.key === "Escape") setEditing(false);
				}}
				className="min-w-0 flex-1 rounded-sm border border-ring bg-background px-1 font-mono text-[12px] tabular-nums text-foreground outline-none"
			/>
		);
	}

	return (
		<button
			type="button"
			onDoubleClick={startEditing}
			onClick={() => setSelectedId(isSelected ? null : item.id)}
			className="min-w-0 flex-1 cursor-pointer truncate text-left font-mono text-[12px] tabular-nums text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
			aria-label={`${item.type === "pole" ? "Pole" : "Zero"} at ${formatComplex(item)}, double-click to edit`}
		>
			{formatComplex(item)}
		</button>
	);
}

function PlacedRow({ item, isSelected }: { item: Complex; isSelected: boolean }) {
	const isPole = item.type === "pole";

	return (
		<div
			className={`flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 transition-colors ${
				isSelected ? "ring-1 ring-ring bg-secondary" : "hover:bg-secondary/50"
			}`}
		>
			{isPole ? (
				<X className="size-3 shrink-0 text-pole" strokeWidth={2.5} aria-hidden="true" />
			) : (
				<Circle className="size-3 shrink-0 text-zero" strokeWidth={2.5} aria-hidden="true" />
			)}

			<EditableValue item={item} isSelected={isSelected} />

			<button
				type="button"
				onClick={() => removeSingularity(item.id)}
				className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={`Remove ${item.type}`}
			>
				<X className="size-3" />
			</button>
		</div>
	);
}

export function PlacedList() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const selectedId = useStore(explorerStore, (s) => s.selectedId);

	const items = [...poles, ...zeros];

	if (items.length === 0) {
		return (
			<p className="py-2 text-center text-[11px] italic text-muted-foreground">
				Drag a pole (&times;) or zero (&cir;) onto the plane to begin exploring
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
