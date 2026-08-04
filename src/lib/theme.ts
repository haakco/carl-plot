type Theme = "dark" | "light";

const STORAGE_KEY = "explorer-theme";

function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

let currentTheme: Theme = "dark";

export function initTheme(): void {
	currentTheme = getInitialTheme();
	applyTheme(currentTheme);
}

export function getTheme(): Theme {
	return currentTheme;
}

export function toggleTheme(): Theme {
	currentTheme = currentTheme === "dark" ? "light" : "dark";
	localStorage.setItem(STORAGE_KEY, currentTheme);
	applyTheme(currentTheme);
	return currentTheme;
}

function applyTheme(theme: Theme): void {
	document.documentElement.classList.toggle("dark", theme === "dark");
}
