import { create } from "zustand";

type ReplaySpeed = 0.5 | 1 | 2 | 5;

type ReplayControlStore = {
	isPaused: boolean;
	speed: ReplaySpeed;

	// playback window and playhead, in wall-clock receive ms (set by the engine)
	windowStartMs: number | null;
	windowEndMs: number | null;
	cursorMs: number | null;
	// absolute target the engine moves the playhead to on its next tick
	pendingSeekMs: number | null;

	setPaused: (isPaused: boolean) => void;
	setSpeed: (speed: ReplaySpeed) => void;
	jumpBy: (deltaMs: number) => void;
	seekTo: (absoluteMs: number) => void;
	setWindow: (startMs: number | null, endMs: number | null, cursorMs: number | null) => void;
	clearPendingSeek: () => void;
	resetReplayControls: () => void;
};

function clampToWindow(target: number, start: number | null, end: number | null): number {
	let value = target;
	if (start !== null) value = Math.max(start, value);
	if (end !== null) value = Math.min(end, value);
	return value;
}

export const useReplayControlStore = create<ReplayControlStore>((set) => ({
	isPaused: false,
	speed: 1,

	windowStartMs: null,
	windowEndMs: null,
	cursorMs: null,
	pendingSeekMs: null,

	setPaused: (isPaused) => set({ isPaused }),
	setSpeed: (speed) => set({ speed }),

	jumpBy: (deltaMs) =>
		set((state) => {
			// base off a pending seek if one is queued so rapid presses accumulate
			const base = state.pendingSeekMs ?? state.cursorMs ?? state.windowEndMs;
			if (base === null) return {};
			return { pendingSeekMs: clampToWindow(base + deltaMs, state.windowStartMs, state.windowEndMs) };
		}),

	seekTo: (absoluteMs) =>
		set((state) => ({ pendingSeekMs: clampToWindow(absoluteMs, state.windowStartMs, state.windowEndMs) })),

	setWindow: (windowStartMs, windowEndMs, cursorMs) =>
		set((state) => {
			// no-op when nothing changed to avoid needless re-renders of subscribers
			if (state.windowStartMs === windowStartMs && state.windowEndMs === windowEndMs && state.cursorMs === cursorMs) {
				return {};
			}
			return { windowStartMs, windowEndMs, cursorMs };
		}),

	clearPendingSeek: () => set({ pendingSeekMs: null }),

	// jump back to the live edge and resume at 1x
	resetReplayControls: () =>
		set((state) => ({ isPaused: false, speed: 1, pendingSeekMs: state.windowEndMs })),
}));
