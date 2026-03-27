import type { ReactNode } from "react";
import "@/app.css";
import "katex/dist/katex.min.css";

export default function Layout({ children }: { children: ReactNode }) {
	return <div className="dark">{children}</div>;
}
