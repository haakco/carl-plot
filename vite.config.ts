import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import tailwindcss from "@tailwindcss/vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
	server: {
		host: true,
	},
	plugins: [
		react(),
		vike(),
		tailwindcss(),
		glsl({
			include: ["**/*.glsl", "**/*.vert", "**/*.frag"],
			warnDuplicatedImports: true,
		}),
	],
	resolve: {
		alias: { "@": "/src" },
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("three") || id.includes("@react-three")) {
						return "three";
					}
					if (id.includes("mathjs")) {
						return "math";
					}
					if (id.includes("katex")) {
						return "katex";
					}
				},
			},
		},
	},
});
