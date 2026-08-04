const WINDOW_SIZE = 60;
const LOW_FPS_THRESHOLD = 25;
const HIGH_FPS_THRESHOLD = 55;

export class PerformanceMonitor {
	private frameTimes: number[] = [];
	private onReduceQuality: () => void;
	private onIncreaseQuality: () => void;

	constructor(onReduceQuality: () => void, onIncreaseQuality: () => void) {
		this.onReduceQuality = onReduceQuality;
		this.onIncreaseQuality = onIncreaseQuality;
	}

	measureFrame(dt: number): void {
		this.frameTimes.push(dt);

		if (this.frameTimes.length < WINDOW_SIZE) return;

		const totalTime = this.frameTimes.reduce((sum, t) => sum + t, 0);
		const averageFps = 1000 / (totalTime / WINDOW_SIZE);

		this.frameTimes = [];

		if (averageFps < LOW_FPS_THRESHOLD) {
			this.onReduceQuality();
		} else if (averageFps > HIGH_FPS_THRESHOLD) {
			this.onIncreaseQuality();
		}
	}
}
