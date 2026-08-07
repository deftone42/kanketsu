import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreCard } from "./ScoreCard";
import { ScoreLevel, TimingScore } from "@/core/domain/models/score";

function timingScore(overrides: Partial<TimingScore> = {}): TimingScore {
  return {
    score: 85,
    level: "PERFECT_TIME",
    badgeText: "Completed Story",
    summary: "Available to watch in full.",
    details: "All episodes and movies are released.",
    notes: [],
    ...overrides,
  };
}

const renderScore = (score: TimingScore) => render(<ScoreCard score={score} />);

const card = () => screen.getByRole("region", { name: "Watching score" });

describe("ScoreCard", () => {
  it("names itself as a landmark", () => {
    renderScore(timingScore());

    expect(card()).toBeInTheDocument();
  });

  it("shows the numeric verdict out of 100", () => {
    renderScore(timingScore({ score: 92 }));

    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("shows the badge, summary and details", () => {
    renderScore(
      timingScore({
        badgeText: "Hype Window Active!",
        summary: "Season 2 premieres in 12 days!",
        details: "Perfect timing to binge now.",
      }),
    );

    expect(screen.getByText("Hype Window Active!")).toBeInTheDocument();
    expect(screen.getByText("Season 2 premieres in 12 days!")).toBeInTheDocument();
    expect(screen.getByText("Perfect timing to binge now.")).toBeInTheDocument();
  });

  it("announces the verdict rather than relying on colour alone", () => {
    renderScore(
      timingScore({ score: 10, level: "NOT_RECOMMENDED", badgeText: "Cancelled Series" }),
    );

    expect(card()).toHaveAccessibleDescription(
      "Cancelled Series. Scored 10 out of 100.",
    );
  });

  it("renders every score level without falling back", () => {
    const levels: ScoreLevel[] = [
      "PERFECT_TIME",
      "GOOD_TIME",
      "IF_CANT_WAIT",
      "RISK_INCOMPLETE",
      "NOT_GOOD_TIME",
      "NOT_RECOMMENDED",
    ];

    for (const level of levels) {
      const { unmount } = renderScore(timingScore({ level, badgeText: level }));

      expect(screen.getByText(level)).toBeInTheDocument();

      unmount();
    }
  });

  it("shows a zero score rather than hiding it", () => {
    renderScore(timingScore({ score: 0, level: "NOT_RECOMMENDED" }));

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
