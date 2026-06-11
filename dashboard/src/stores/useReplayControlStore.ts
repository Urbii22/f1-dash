import { create } from "zustand";

type ReplaySpeed = 0.5 | 1 | 2 | 5;

type ReplayControlStore = {
	isPaused: boolean;
	speed: ReplaySpeed;
	seekOffsetMs: number;

	// playback window exposed by the data engine (local ms timestamps)
	windowStartMs: number | null;
	windowEndMs: number | null;
	cursorMs: number | null;
	// absolute target the engine resolves into a seek offset on its next tick
	pendingSeekMs: number | null;

	setPaused: (isPaused: boolean) => void;
	setSpeed: (speed: ReplaySpeed) => void;
	jumpBy: (deltaMs: number) => void;
	seekTo: (absoluteMs: number) => void;
	setWindow: (startMs: number | null, endMs: number | null, cursorMs: number | null) => void;
	applySeekOffset: (seekOffsetMs: number) => void;
	resetReplayControls: () => void;
};

export const useReplayControlStore = create<ReplayControlStore>((set) => ({
	isPaused: false,
	speed: 1,
	seekOffsetMs: 0,

	windowStartMs: null,
	windowEndMs: null,
	cursorMs: null,
	pendingSeekMs: null,

	setPaused: (isPaused) => set({ isPaused }),
	setSpeed: (speed) => set({ speed }),
	jumpBy: (deltaMs) => set((state) => ({ seekOffsetMs: state.seekOffsetMs + deltaMs })),
	seekTo: (absoluteMs) =>
		set((state) => {
			// clamp into the available buffer window
			const min = state.windowStartMs;
			const max = state.windowEndMs;
			let target = absoluteMs;
			if (min !== null) target = Math.max(min, target);
			if (max !== null) target = Math.min(max, target);
			return { pendingSeekMs: target };
		}),
	setWindow: (windowStartMs, windowEndMs, cursorMs) => set({ windowStartMs, windowEndMs, cursorMs }),
	applySeekOffset: (seekOffsetMs) => set({ seekOffsetMs, pendingSeekMs: null }),
	resetReplayControls: () => set({ isPaused: false, speed: 1, seekOffsetMs: 0, pendingSeekMs: null }),
}));
