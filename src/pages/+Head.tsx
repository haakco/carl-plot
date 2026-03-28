const icons = [
	{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
	{ rel: "icon", href: "/icon-192.png", sizes: "192x192", type: "image/png" },
	{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
] as const;

const fontLinks = [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
	},
] as const;

export default function Head() {
	return (
		<>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta
				name="description"
				content="Interactive complex function explorer — drag poles and zeros, see real-time domain coloring"
			/>
			{icons.map((icon) => (
				<link key={icon.href} {...icon} />
			))}
			{fontLinks.map((link) => (
				<link key={link.href} {...link} />
			))}
			<title>Complex Explorer</title>
		</>
	);
}
