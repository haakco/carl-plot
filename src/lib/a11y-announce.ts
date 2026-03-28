/**
 * Lightweight aria-live announcement helper.
 *
 * Components call `announceToScreenReader(msg)` and the <A11yAnnouncer>
 * component renders the latest message in a visually-hidden aria-live region.
 */

type Listener = (message: string) => void;

let _listener: Listener | null = null;

export function announceToScreenReader(message: string): void {
	_listener?.(message);
}

export function subscribeAnnouncer(listener: Listener): () => void {
	_listener = listener;
	return () => {
		if (_listener === listener) _listener = null;
	};
}
