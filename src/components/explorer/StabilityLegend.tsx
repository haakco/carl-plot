import { useStore } from "@tanstack/react-store";
import { explorerStore } from "@/store/explorer-store";

const items = [
	{ color: "oklch(0.7 0.15 145)", label: "Stable (|p| < 1)" },
	{ color: "oklch(0.7 0.15 85)", label: "Marginal (|p| ≈ 1)" },
	{ color: "oklch(0.7 0.15 25)", label: "Unstable (|p| > 1)" },
] as const;

export function StabilityLegend() {
	const poles = useStore(explorerStore, (s) => s.poles);

	// Only show the legend when there are poles to interpret
	if (poles.length === 0) return null;

	return (
		<div className="absolute bottom-2 left-2 flex flex-col gap-0.5 rounded-sm bg-[oklch(0.13_0.015_247_/_0.8)] px-2 py-1.5">
			<span className="text-[10px] font-medium text-muted-foreground">Pole stability</span>
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-1.5">
					<span
						className="inline-block size-2.5 rounded-full"
						style={{ backgroundColor: item.color }}
					/>
					<span className="font-mono text-[10px] text-foreground">{item.label}</span>
				</div>
			))}
		</div>
	);
}
