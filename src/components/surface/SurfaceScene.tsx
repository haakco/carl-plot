import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo } from "react";
import { getViewportBounds } from "@/lib/viewport";
import { explorerStore } from "@/store/explorer-store";
import { SurfaceMesh } from "./SurfaceMesh";

/**
 * Keep the 3D camera and helper grid aligned with the active viewport.
 */
function ViewportFrame() {
	const { camera, size } = useThree();
	const center = useStore(explorerStore, (s) => s.center);
	const zoom = useStore(explorerStore, (s) => s.zoom);

	const bounds = useMemo(() => {
		const width = size.width || 800;
		const height = size.height || 600;
		return getViewportBounds(width, height, center, zoom);
	}, [center, zoom, size.width, size.height]);

	const cameraPosition = useMemo(() => {
		const extentRe = bounds.reMax - bounds.reMin;
		const extentIm = bounds.imMax - bounds.imMin;
		const maxExtent = Math.max(extentRe, extentIm);
		const dist = maxExtent * 1.2;
		return [dist * 0.7, dist * 0.8, dist * 0.7] as [number, number, number];
	}, [bounds]);

	const gridSize = useMemo(() => {
		const extentRe = bounds.reMax - bounds.reMin;
		const extentIm = bounds.imMax - bounds.imMin;
		const maxExtent = Math.max(extentRe, extentIm);
		const size = Math.ceil(maxExtent);
		return Math.max(size, 2);
	}, [bounds]);

	useEffect(() => {
		camera.position.set(...cameraPosition);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
	}, [camera, cameraPosition]);

	return <gridHelper args={[gridSize, gridSize * 2, "#444444", "#333333"]} />;
}

export function SurfaceScene() {
	return (
		<Canvas
			camera={{ position: [4, 5, 4], fov: 50, near: 0.1, far: 200 }}
			gl={{ preserveDrawingBuffer: true }}
			style={{ width: "100%", height: "100%" }}
		>
			<ambientLight intensity={0.4} />
			<directionalLight position={[5, 10, 5]} intensity={0.8} />
			<directionalLight position={[-5, 5, -5]} intensity={0.3} />

			<SurfaceMesh />

			<ViewportFrame />

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
