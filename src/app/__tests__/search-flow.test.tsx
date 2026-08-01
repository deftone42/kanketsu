import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "../page";

describe("User Search Flow", () => {
  it("allows the user to type into the search input and renders the anime result", async () => {
    const user = userEvent.setup();
    render(<Page />);

    const input = screen.getByLabelText("Search anime textfield");
    expect(input).toBeInTheDocument();

    await user.type(input, "One Piece");

    expect(await screen.findByLabelText("Anime title")).toHaveTextContent(
      "One Piece",
    );
  });

  it("renders anime details when a result is clicked", async () => {
    const user = userEvent.setup();
    render(<Page />);

    const input = screen.getByLabelText("Search anime textfield");
    await user.type(input, "One Piece");

    const resultButton = await screen.findByRole("button", {
      name: "One Piece selection button",
    });
    await user.click(resultButton);

    await screen.findByLabelText("Anime detail card");

    const score = await screen.findByText(/Watch it if you can't wait/i);
    expect(score).toBeInTheDocument();
  });
});
