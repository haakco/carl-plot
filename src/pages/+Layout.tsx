import type { ReactNode } from "react";
import { useEffect } from "react";
import { initTheme } from "@/lib/theme";
import "@/app.css";
import "katex/dist/katex.min.css";

export default function Layout({ children }: { children: ReactNode }) {
	useEffect(() => {
		initTheme();
	}, []);

	return <>{children}</>;
}
