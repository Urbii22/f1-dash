"use client";

import type { ReactNode } from "react";

export default function NewUiCompatibilityBoundary({
	routeName,
	children,
}: {
	routeName: string;
	children: ReactNode;
}) {
	return (
		<div className="new-ui-compat" data-route={routeName}>
			<div className="new-ui-compat__notice" role="note">
				<span className="new-ui-compat__route">{routeName}</span>
				<span className="new-ui-compat__message">
					This route is still using the Legacy layout inside New UI.
				</span>
			</div>
			<div className="new-ui-compat__content">{children}</div>
		</div>
	);
}
