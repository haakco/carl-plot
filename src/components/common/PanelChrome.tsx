import type { ReactNode } from "react";

export function PanelChrome({
	title,
	actions,
	children,
}: {
	title: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<span className="text-[10px] text-muted-foreground">{title}</span>
				{actions}
			</div>
			{children}
		</div>
	);
}

export function PanelSurface({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	const classes = ["rounded border bg-[oklch(0.13_0.01_247)]", className].filter(Boolean).join(" ");
	return <div className={classes}>{children}</div>;
}
