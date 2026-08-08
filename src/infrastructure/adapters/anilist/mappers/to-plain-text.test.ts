import { describe, it, expect } from "vitest";
import { toPlainText } from "./to-plain-text";

describe("toPlainText", () => {
  it("strips the line breaks AniList emits even with asHtml: false", () => {
    expect(toPlainText("First line.<br><br>Second line.")).toBe(
      "First line. Second line.",
    );
  });

  it("strips inline emphasis tags", () => {
    expect(toPlainText("A <i>very</i> <b>good</b> series")).toBe(
      "A very good series",
    );
  });

  it("decodes the entities AniList emits", () => {
    expect(toPlainText("Steins;Gate &amp; friends &quot;quoted&quot;")).toBe(
      'Steins;Gate & friends "quoted"',
    );
    expect(toPlainText("&lt;tag&gt; and it&#039;s fine")).toBe(
      "<tag> and it's fine",
    );
  });

  it("collapses the whitespace stripping leaves behind", () => {
    expect(toPlainText("Trailing  \n\n  gaps   here ")).toBe(
      "Trailing gaps here",
    );
  });

  it("returns null for an absent description", () => {
    expect(toPlainText(null)).toBeNull();
    expect(toPlainText(undefined)).toBeNull();
  });

  it("returns null when nothing survives stripping", () => {
    expect(toPlainText("<br><br>   ")).toBeNull();
    expect(toPlainText("")).toBeNull();
  });
});
