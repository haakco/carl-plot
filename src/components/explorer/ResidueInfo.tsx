import { useStore } from "@tanstack/react-store";
import katex from "katex";
import { useMemo } from "react";
import { computeResidue, formatResidue } from "@/math/residue";
import { explorerStore } from "@/store/explorer-store";

export function ResidueInfo() {
	const selectedId = useStore(explorerStore, (s) => s.selectedId);
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	const selectedPole = useMemo(() => {
		if (!selectedId) return null;
		return poles.find((p) => p.id === selectedId) ?? null;
	}, [selectedId, poles]);

	const residueHtml = useMemo(() => {
		if (!selectedPole) return null;
		const result = computeResidue(selectedPole, poles, zeros, gain);
		const latex = formatResidue(result);
		return katex.renderToString(latex, {
			throwOnError: false,
			displayMode: false,
		});
	}, [selectedPole, poles, zeros, gain]);

	if (!residueHtml) return null;

	// KaTeX produces safe HTML from our own internally-generated LaTeX strings
	// (no user input flows into the LaTeX). This is the same pattern used
	// throughout the codebase (FormulaBar, ExpressionLatexDisplay).
	return (
		<div
			className="ml-2 shrink-0 rounded border bg-secondary/50 px-2 py-0.5 text-[12px] text-muted-foreground"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX produces safe HTML from our own LaTeX strings
			dangerouslySetInnerHTML={{ __html: residueHtml }}
		/>
	);
}
