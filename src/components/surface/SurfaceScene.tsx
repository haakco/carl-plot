import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { getViewportBounds } from "@/math/surface-mesh";
import { explorerStore } from "@/store/explorer-store";
import { SurfaceMesh } from "./SurfaceMesh";

/**
 * Compute a camera position that frames the currently visible domain.
 * The camera is placed at a 45-degree elevation looking at the origin,
 * at a distance proportional to the visible extent.
 */
function useViewportCamera(): [number, number, number] {
	const center = useStore(explorerStore, (s) => s.center);
	const zoom = useStore(explorerStore, (s) => s.zoom);

	return useMemo(() => {
		// Use a default canvas size for initial framing; the actual canvas
		// dimensions are not available until mounted, but this gives a
		// good default that matches the typical aspect ratio.
		const bounds = getViewportBounds(800, 600, center, zoom);
		const extentRe = bounds.reMax - bounds.reMin;
		const extentIm = bounds.imMax - bounds.imMin;
		const maxExtent = Math.max(extentRe, extentIm);

		// Place camera so the entire surface is visible at ~45 degrees
		const dist = maxExtent * 1.2;
		return [dist * 0.7, dist * 0.8, dist * 0.7] as [number, number, number];
	}, [center, zoom]);
}

export function SurfaceScene() {
	const cameraPosition = useViewportCamera();
	const center = useStore(explorerStore, (s) => s.center);
	const zoom = useStore(explorerStore, (s) => s.zoom);

	// Compute grid size based on visible extent
	const gridSize = useMemo(() => {
		const bounds = getViewportBounds(800, 600, center, zoom);
		const extentRe = bounds.reMax - bounds.reMin;
		const extentIm = bounds.imMax - bounds.imMin;
		const maxExtent = Math.max(extentRe, extentIm);
		const size = Math.ceil(maxExtent);
		return Math.max(size, 2);
	}, [center, zoom]);

	return (
		<Canvas
			camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 200 }}
			gl={{ preserveDrawingBuffer: true }}
			style={{ width: "100%", height: "100%" }}
		>
			<ambientLight intensity={0.4} />
			<directionalLight position={[5, 10, 5]} intensity={0.8} />
			<directionalLight position={[-5, 5, -5]} intensity={0.3} />

			<SurfaceMesh />

			<gridHelper args={[gridSize, gridSize * 2, "#444444", "#333333"]} />

			<OrbitControls
				enableDamping
				dampingFactor={0.1}
				minDistance={1}
				maxDistance={50}
				maxPolarAngle={Math.PI / 2 + 0.3}
			/>
		</Canvas>
	);
}
