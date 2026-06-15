import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import WorkspaceSplitter from "@/components/new-ui/layout/WorkspaceSplitter";

function renderSplitter(overrides: Partial<React.ComponentProps<typeof WorkspaceSplitter>> = {}) {
	const onChange = vi.fn();
	render(
		<WorkspaceSplitter
			label="Resize classification"
			orientation="vertical"
			value={50}
			min={32}
			max={62}
			onChange={onChange}
			{...overrides}
		/>,
	);
	return { onChange };
}

describe("WorkspaceSplitter accessibility", () => {
	test("exposes separator role with orientation and current/min/max values", () => {
		renderSplitter();
		const separator = screen.getByRole("separator", { name: "Resize classification" });
		expect(separator).toHaveAttribute("aria-orientation", "vertical");
		expect(separator).toHaveAttribute("aria-valuenow", "50");
		expect(separator).toHaveAttribute("aria-valuemin", "32");
		expect(separator).toHaveAttribute("aria-valuemax", "62");
		expect(separator).toHaveAttribute("tabindex", "0");
	});

	test("Arrow keys change value by 1", () => {
		const { onChange } = renderSplitter();
		const separator = screen.getByRole("separator");
		fireEvent.keyDown(separator, { key: "ArrowRight" });
		expect(onChange).toHaveBeenLastCalledWith(51);
		fireEvent.keyDown(separator, { key: "ArrowLeft" });
		expect(onChange).toHaveBeenLastCalledWith(49);
	});

	test("Shift+Arrow changes value by 5", () => {
		const { onChange } = renderSplitter();
		const separator = screen.getByRole("separator");
		fireEvent.keyDown(separator, { key: "ArrowRight", shiftKey: true });
		expect(onChange).toHaveBeenLastCalledWith(55);
		fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true });
		expect(onChange).toHaveBeenLastCalledWith(45);
	});

	test("vertical splitter also responds to Up/Down arrows", () => {
		const { onChange } = renderSplitter({ orientation: "horizontal" });
		const separator = screen.getByRole("separator");
		fireEvent.keyDown(separator, { key: "ArrowDown" });
		expect(onChange).toHaveBeenLastCalledWith(51);
		fireEvent.keyDown(separator, { key: "ArrowUp" });
		expect(onChange).toHaveBeenLastCalledWith(49);
	});

	test("Home sets minimum and End sets maximum", () => {
		const { onChange } = renderSplitter();
		const separator = screen.getByRole("separator");
		fireEvent.keyDown(separator, { key: "Home" });
		expect(onChange).toHaveBeenLastCalledWith(32);
		fireEvent.keyDown(separator, { key: "End" });
		expect(onChange).toHaveBeenLastCalledWith(62);
	});

	test("pointer drag reports a normalized percentage against the parent bounds", () => {
		const onChange = vi.fn();
		render(
			<div style={{ position: "relative" }} data-testid="parent">
				<WorkspaceSplitter
					label="Resize"
					orientation="vertical"
					value={50}
					min={32}
					max={62}
					onChange={onChange}
				/>
			</div>,
		);
		const separator = screen.getByRole("separator");
		const parent = screen.getByTestId("parent");
		parent.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

		separator.setPointerCapture = vi.fn();
		separator.releasePointerCapture = vi.fn();
		separator.hasPointerCapture = vi.fn().mockReturnValue(true);

		fireEvent.pointerDown(separator, { pointerId: 1, clientX: 500 });
		// vertical splitter: 600px / 1000px width => 60%, clamped within [32,62]
		fireEvent.pointerMove(separator, { pointerId: 1, clientX: 600 });
		expect(onChange).toHaveBeenLastCalledWith(60);
	});
});
