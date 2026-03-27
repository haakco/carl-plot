import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { SurfaceMesh } from "./SurfaceMesh";

export function SurfaceScene() {
	return (
		<Canvas
			camera={{ position: [4, 5, 4], fov: 50, near: 0.1, far: 100 }}
			style={{ width: "100%", height: "100%" }}
		>
			<ambientLight intensity={0.4} />
			<directionalLight position={[5, 10, 5]} intensity={0.8} />
			<directionalLight position={[-5, 5, -5]} intensity={0.3} />

			<SurfaceMesh />

			<gridHelper args={[6, 12, "#444444", "#333333"]} />

			<OrbitControls
				enableDamping
				dampingFactor={0.1}
				minDistance={2}
				maxDistance={20}
				maxPolarAngle={Math.PI / 2 + 0.3}
			/>
		</Canvas>
	);
}
