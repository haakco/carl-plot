import { useStore } from "@tanstack/react-store";
import katex from "katex";
import { useCallback, useMemo } from "react";
import { buildFactoredLaTeX } from "@/math/formula-latex";
import { explorerStore } from "@/store/explorer-store";

export function FormulaBar() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);

	const latexString = useMemo(() => {
		if (poles.length === 0 && zeros.length === 0) {
			return "f(z) = 1";
		}
		return buildFactoredLaTeX(zeros, poles, gain);
	}, [poles, zeros, gain]);

	const renderedHtml = useMemo(() => {
		return katex.renderToString(latexString, {
			throwOnError: false,
			displayMode: false,
		});
	}, [latexString]);

	const copyLatex = useCallback(() => {
		navigator.clipboard.writeText(latexString);
	}, [latexString]);

	// KaTeX.renderToString produces safe, deterministic HTML from our own
	// LaTeX strings (never user-supplied HTML), so dangerouslySetInnerHTML
	// is appropriate here.
	return (
		<div className="flex h-12 shrink-0 items-center justify-between border-t bg-secondary/30 px-3">
			<div
				className="overflow-x-auto text-[14px]"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX produces safe HTML from our own LaTeX strings
				dangerouslySetInnerHTML={{ __html: renderedHtml }}
			/>

			<button
				type="button"
				onClick={copyLatex}
				className="ml-3 shrink-0 rounded border px-2 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
			>
				Copy LaTeX
			</button>
		</div>
	);
}
