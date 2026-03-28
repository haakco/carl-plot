import { useThree } from "@react-three/fiber";
import { useStore } from "@tanstack/react-store";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createExpressionEvaluator } from "@/math/evaluate-expression";
import { generateSurfaceMesh } from "@/math/surface-mesh";
import { explorerStore } from "@/store/explorer-store";

const RESOLUTION = 128;

export function SurfaceMesh() {
	const meshRef = useRef<THREE.Mesh>(null);
	const poles = useStore(explorerStore, (s) => s.poles);
	const zeros = useStore(explorerStore, (s) => s.zeros);
	const gain = useStore(explorerStore, (s) => s.gain);
	const center = useStore(explorerStore, (s) => s.center);
	const zoom = useStore(explorerStore, (s) => s.zoom);
	const mode = useStore(explorerStore, (s) => s.mode);
	const expression = useStore(explorerStore, (s) => s.expression);
	const { size } = useThree();

	const geometry = useMemo(() => {
		let customEval: ((re: number, im: number) => { mag: number; arg: number }) | undefined;
		if (mode === "expression" && expression) {
			const evaluator = createExpressionEvaluator(expression);
			if (evaluator) {
				customEval = evaluator;
			}
		}

		const canvasWidth = size.width || 800;
		const canvasHeight = size.height || 600;

		const { positions, colors, indices } = generateSurfaceMesh(
			poles,
			zeros,
			gain,
			center,
			zoom,
			RESOLUTION,
			customEval,
			canvasWidth,
			canvasHeight,
		);

		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geo.setIndex(new THREE.BufferAttribute(indices, 1));
		geo.computeVertexNormals();

		return geo;
	}, [poles, zeros, gain, center, zoom, mode, expression, size.width, size.height]);

	return (
		<mesh ref={meshRef} geometry={geometry}>
			<meshStandardMaterial vertexColors side={THREE.DoubleSide} />
		</mesh>
	);
}
