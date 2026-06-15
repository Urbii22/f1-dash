"use client";

import type { ReactNode } from "react";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

export default function UiModeBoundary(props: { legacy: ReactNode; simple: ReactNode; detailed: ReactNode }) {
	const { generation, density, hydrated } = useUiPreferencesStore();
	if (!hydrated || generation === "legacy") return props.legacy;
	return density === "simple" ? props.simple : props.detailed;
}
