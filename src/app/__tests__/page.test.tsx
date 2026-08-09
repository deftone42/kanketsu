import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Home from "../page";
import {
  BASE_SCORES,
  SITUATION_COPY,
} from "@/core/domain/services/evaluate-score";
import { WatchingSituation } from "@/core/domain/services/watching-situation";

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

const situations = Object.keys(BASE_SCORES) as WatchingSituation[];

const section = (name: string) => screen.getByRole("region", { name });

describe("home page", () => {
  it("leads with what the page answers, not just the brand", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toHaveTextContent("Is now a good time to start that anime?");
  });

  it("offers a collapsed search combobox", () => {
    render(<Home />);

    const combobox = screen.getByRole("combobox", { name: "Search anime" });

    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows no verdict until something is selected", () => {
    render(<Home />);

    expect(
      screen.queryByRole("region", { name: "Watching score" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByText("Search for any title above to calculate the watch timing"),
    ).toBeInTheDocument();
  });

  it("explains the scoring without needing a search", () => {
    render(<Home />);

    expect(section("How Kanketsu decides")).toBeInTheDocument();
    expect(section("What the number means")).toBeInTheDocument();
    expect(section("The eight situations")).toBeInTheDocument();
    expect(section("Only a finished story reaches 100")).toBeInTheDocument();
  });

  it("documents every situation the domain can produce", () => {
    render(<Home />);

    const situationsSection = within(section("The eight situations"));

    situations.forEach((situation) => {
      expect(
        situationsSection.getByText(SITUATION_COPY[situation].badgeText),
      ).toBeInTheDocument();
    });
  });

  it("documents each situation with the base score the domain assigns it", () => {
    render(<Home />);

    const situationsSection = within(section("The eight situations"));

    situations.forEach((situation) => {
      expect(
        situationsSection.getByText(String(BASE_SCORES[situation])),
      ).toBeInTheDocument();
    });
  });

  it("lists the six score bands a reader can land in", () => {
    render(<Home />);

    const bandsSection = within(section("What the number means"));

    expect(bandsSection.getAllByRole("listitem")).toHaveLength(6);
    expect(bandsSection.getByText("90 – 100")).toBeInTheDocument();
    expect(bandsSection.getByText("Perfect time")).toBeInTheDocument();
  });

  it("keeps the guide below the search, so a selection pushes it down", () => {
    render(<Home />);

    const search = screen.getByRole("combobox", { name: "Search anime" });
    const guide = section("How Kanketsu decides");

    expect(
      search.compareDocumentPosition(guide) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
