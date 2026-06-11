/**
 * Pure playback-clock advancement for the replay engine.
 *
 * The buffer indexes frames by wall-clock receive time. The playhead advances
 * by real-elapsed-time × speed each tick (so 2× consumes the buffer twice as
 * fast, 0.5× half as fast), unless an explicit seek target is queued. The
 * result is clamped to the available buffer window [oldest, latest].
 */
export type AdvancePlayheadParams = {
	current: number;
	realElapsedMs: number;
	speed: number;
	pendingSeekMs: number | null;
	oldest: number | null;
	latest: number | null;
	paused?: boolean;
};

export function advancePlayhead({
	current,
	realElapsedMs,
	speed,
	pendingSeekMs,
	oldest,
	latest,
	paused = false,
}: AdvancePlayheadParams): number {
	let next = pendingSeekMs !== null ? pendingSeekMs : current + (paused ? 0 : Math.max(0, realElapsedMs) * speed);

	if (latest !== null) next = Math.min(next, latest);
	if (oldest !== null) next = Math.max(next, oldest);

	return next;
}
