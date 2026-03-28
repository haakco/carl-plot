import { useStore } from "@tanstack/react-store";
import { Circle, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { enforceConjugate } from "@/hooks/useConjugatePairs";
import type { Complex } from "@/math/complex";
import { formatComplex } from "@/math/complex";
import {
	explorerStore,
	moveSingularity,
	removeSingularity,
	setSelectedId,
} from "@/store/explorer-store";

function parseCoordinate(raw: string): { re: number; im: number } | null {
	const s = raw.trim().replace(/\s/g, "");
	if (!s) return null;

	// Try "a+bi" or "a-bi" format
	const match = s.match(/^([+-]?[\d.]+)([+-][\d.]+)i$/);
	if (match) {
		const re = Number.parseFloat(match[1]);
		const im = Number.parseFloat(match[2]);
		if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
		return { re, im };
	}

	// Pure imaginary "bi"
	const imMatch = s.match(/^([+-]?[\d.]+)i$/);
	if (imMatch) {
		const im = Number.parseFloat(imMatch[1]);
		if (!Number.isFinite(im)) return null;
		return { re: 0, im };
	}

	// Pure real
	const re = Number.parseFloat(s);
	if (Number.isFinite(re)) return { re, im: 0 };

	return null;
}

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
			if (explorerStore.state.enforceConjugates) {
				enforceConjugate(explorerStore, item.id, parsed);
			} else {
				moveSingularity(item.id, parsed.re, parsed.im);
			}
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
			className="min-w-0 flex-1 cursor-pointer truncate text-left font-mono text-[12px] tabular-nums text-foreground"
			title="Double-click to edit"
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
				<X className="size-3 shrink-0 text-pole" strokeWidth={2.5} />
			) : (
				<Circle className="size-3 shrink-0 text-zero" strokeWidth={2.5} />
			)}

			<EditableValue item={item} isSelected={isSelected} />

			<button
				type="button"
				onClick={() => removeSingularity(item.id)}
				className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
