import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import InterfaceGenerationToggle from "@/components/new-ui/InterfaceGenerationToggle";

test("does not render a New UI switcher", () => {
	render(<InterfaceGenerationToggle />);
	expect(screen.queryByRole("button", { name: /ui/i })).not.toBeInTheDocument();
});
