"use client";

import type { ReactNode } from "react";

export default function UiModeBoundary(props: { legacy: ReactNode; simple: ReactNode; detailed: ReactNode }) {
	return props.legacy;
}
