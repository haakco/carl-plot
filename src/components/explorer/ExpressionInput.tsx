import { useStore } from "@tanstack/react-store";
import { useCallback, useState } from "react";
import { explorerStore, setExpression } from "@/store/explorer-store";

export function ExpressionInput() {
	const expression = useStore(explorerStore, (s) => s.expression);
	const expressionError = useStore(explorerStore, (s) => s.expressionError);
	const [localValue, setLocalValue] = useState(expression);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setLocalValue(value);
		setExpression(value);
	}, []);

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<input
				type="text"
				value={localValue}
				onChange={handleChange}
				placeholder="Type an expression, e.g. z^2 + 1/z"
				spellCheck={false}
				className="h-8 w-full rounded border bg-background px-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
			/>
			{expressionError && (
				<p className="mt-0.5 truncate text-[11px] text-red-400">{expressionError}</p>
			)}
		</div>
	);
}
