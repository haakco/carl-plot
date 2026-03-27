import { lazy, Suspense } from "react";

const SurfaceScene = lazy(() =>
	import("@/components/surface/SurfaceScene").then((m) => ({ default: m.SurfaceScene })),
);

function LoadingFallback() {
	return (
		<div className="flex h-full w-full items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-2">
				<div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
				<span className="text-[12px] text-muted-foreground">Loading 3D view...</span>
			</div>
		</div>
	);
}

export function Canvas3D() {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<SurfaceScene />
		</Suspense>
	);
}
