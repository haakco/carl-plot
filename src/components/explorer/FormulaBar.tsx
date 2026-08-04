import { useStore } from "@tanstack/react-store";
import katex from "katex";
import { useCallback, useMemo, useState } from "react";
import { buildFactoredLaTeX } from "@/math/formula-latex";
import { buildExpandedLaTeX } from "@/math/polynomial";
import { explorerStore, setMode, toggleFormulaForm } from "@/store/explorer-store";
import { ExpressionInput } from "./ExpressionInput";
import { ResidueInfo } from "./ResidueInfo";

function FormulaDisplay() {
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);
	const formulaForm = useStore(explorerStore, (s) => s.formulaForm);

	const latexString = useMemo(() => {
		if (poles.length === 0 && zeros.length === 0) {
			return "f(z) = 1";
		}
		if (formulaForm === "expanded") {
			return buildExpandedLaTeX(zeros, poles, gain);
		}
		return buildFactoredLaTeX(zeros, poles, gain);
	}, [poles, zeros, gain, formulaForm]);

	const renderedHtml = useMemo(() => {
		return katex.renderToString(latexString, {
			throwOnError: false,
			displayMode: false,
		});
	}, [latexString]);

	const [copied, setCopied] = useState(false);

	const copyLatex = useCallback(async () => {
		const fallbackCopy = (text: string): boolean => {
			const textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			const ok = document.execCommand("copy");
			document.body.removeChild(textarea);
			return ok;
		};

		let success = false;
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(latexString);
				success = true;
			} else {
				success = fallbackCopy(latexString);
			}
		} catch {
			try {
				success = fallbackCopy(latexString);
			} catch {
				success = false;
			}
		}

		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
	}, [latexString]);

	return (
		<>
			<div
				className="min-w-0 flex-1 overflow-x-auto text-[14px]"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX produces safe HTML from our own LaTeX strings
				dangerouslySetInnerHTML={{ __html: renderedHtml }}
			/>
			<ResidueInfo />
			<button
				type="button"
				onClick={toggleFormulaForm}
				className="ml-2 shrink-0 rounded border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={
					formulaForm === "factored"
						? "Switch to expanded polynomial form"
						: "Switch to factored form"
				}
			>
				{formulaForm === "factored" ? "Expanded" : "Factored"}
			</button>
			<button
				type="button"
				onClick={copyLatex}
				className="ml-1 shrink-0 rounded border px-2 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
			>
				{copied ? "Copied!" : "Copy LaTeX"}
			</button>
		</>
	);
}

function ExpressionLatexDisplay() {
	const latex = useStore(explorerStore, (s) => s.expressionLatex);

	const renderedHtml = useMemo(() => {
		if (!latex) return "";
		return katex.renderToString(`f(z) = ${latex}`, {
			throwOnError: false,
			displayMode: false,
		});
	}, [latex]);

	if (!latex) return null;

	return (
		<div
			className="ml-2 shrink-0 text-[13px] text-muted-foreground"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX produces safe HTML from our own LaTeX strings
			dangerouslySetInnerHTML={{ __html: renderedHtml }}
		/>
	);
}

export function FormulaBar() {
	const mode = useStore(explorerStore, (s) => s.mode);

	const toggleMode = useCallback(() => {
		setMode(mode === "poles-zeros" ? "expression" : "poles-zeros");
	}, [mode]);

	return (
		<div className="flex h-12 shrink-0 items-center gap-2 border-t bg-secondary/30 px-3">
			<button
				type="button"
				onClick={toggleMode}
				className="shrink-0 rounded border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={
					mode === "poles-zeros" ? "Switch to expression mode" : "Switch to pole/zero mode"
				}
			>
				{mode === "poles-zeros" ? "f(z)=" : "P/Z"}
			</button>

			{mode === "poles-zeros" ? (
				<FormulaDisplay />
			) : (
				<>
					<ExpressionInput />
					<ExpressionLatexDisplay />
				</>
			)}
		</div>
	);
}
