import type { TrackPosition } from "@/types/map.type";

const wrapProgress = (progress: number, pointCount: number) =>
	((progress % pointCount) + pointCount) % pointCount;

const getCircularDistance = (from: number, to: number, pointCount: number) => {
	let distance = wrapProgress(to, pointCount) - wrapProgress(from, pointCount);
	if (distance > pointCount / 2) distance -= pointCount;
	if (distance < -pointCount / 2) distance += pointCount;
	return distance;
};

export type TrackMotion = {
	progress: number;
	velocity: number;
};

export type CarMotionTelemetry = {
	speedKph: number;
	throttle: number;
	braking: boolean;
};

export const getInitialTelemetryCalibration = (pointCount: number) => pointCount / (90 * 200);

export const getTelemetryTrackVelocity = (telemetry: CarMotionTelemetry, calibration: number) => {
	const speed = Math.max(0, Math.min(telemetry.speedKph, 400));
	const throttle = Math.max(0, Math.min(telemetry.throttle, 100));
	const pedalFactor = telemetry.braking ? 0.72 : 0.94 + throttle * 0.0006;
	return speed * calibration * pedalFactor;
};

export const updateTelemetryCalibration = (
	current: number,
	observedTrackVelocity: number,
	speedKph: number,
) => {
	if (observedTrackVelocity <= 0 || speedKph < 40) return current;
	const observed = observedTrackVelocity / speedKph;
	const bounded = Math.min(Math.max(observed, current * 0.45), current * 2.2);
	return current * 0.82 + bounded * 0.18;
};

export const estimateTrackVelocity = (
	previousTarget: number,
	nextTarget: number,
	pointCount: number,
	elapsedMs: number,
) => {
	if (pointCount < 2 || elapsedMs <= 0) return 0;
	const velocity = getCircularDistance(previousTarget, nextTarget, pointCount) / (elapsedMs / 1000);
	return Math.min(Math.max(velocity, 0), pointCount / 8);
};

export const stepTrackMotion = (
	motion: TrackMotion,
	target: number,
	targetVelocity: number,
	pointCount: number,
	deltaMs: number,
	stopped = false,
	responseMs = 900,
): TrackMotion => {
	if (stopped || pointCount < 2) return { progress: motion.progress, velocity: 0 };

	const deltaSeconds = Math.max(deltaMs, 0) / 1000;
	const positionError = getCircularDistance(motion.progress, target, pointCount);
	const desiredVelocity = Math.max(0, targetVelocity + positionError / 1.8);
	const velocityAlpha = 1 - Math.exp(-Math.max(deltaMs, 0) / responseMs);
	const velocity = motion.velocity + (desiredVelocity - motion.velocity) * velocityAlpha;

	return {
		progress: motion.progress + velocity * deltaSeconds,
		velocity,
	};
};

export const stepTrackProgress = (
	current: number,
	target: number,
	pointCount: number,
	deltaMs: number,
	stopped = false,
	smoothingMs = 700,
) => {
	if (stopped || pointCount < 2) return current;

	const alpha = 1 - Math.exp(-Math.max(deltaMs, 0) / smoothingMs);
	return current + getCircularDistance(current, target, pointCount) * alpha;
};

export const getTrackPoint = (progress: number, points: TrackPosition[]): TrackPosition => {
	if (points.length === 0) return { x: 0, y: 0 };

	const wrapped = wrapProgress(progress, points.length);
	const startIndex = Math.floor(wrapped);
	const endIndex = (startIndex + 1) % points.length;
	const fraction = wrapped - startIndex;

	return {
		x: points[startIndex].x + (points[endIndex].x - points[startIndex].x) * fraction,
		y: points[startIndex].y + (points[endIndex].y - points[startIndex].y) * fraction,
	};
};
