import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import InterfaceGenerationToggle from "@/components/new-ui/InterfaceGenerationToggle";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

beforeEach(() => useUiPreferencesStore.getState().reset());

test("switches to New UI without navigation", async () => {
	render(<InterfaceGenerationToggle />);
	await userEvent.click(screen.getByRole("button", { name: "Use New UI" }));
	expect(useUiPreferencesStore.getState().generation).toBe("new");
});
