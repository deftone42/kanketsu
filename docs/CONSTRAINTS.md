# 🧭 Kanketsu — External Constraints & Rejected Alternatives

The code carries its intent in its names. This file carries what names cannot: hazards found
against the live AniList API, and alternatives that were tried and rejected. Every entry here cost
a bug to learn, so it is written down rather than rediscovered.

---

## 🔌 What AniList actually does

**One ID space across anime and manga.** Ids are unique across both, so omitting the `type` filter
from `FRANCHISE_BATCH_QUERY` returns source works in the same request as the anime.

**Rate limiting counts requests, not query complexity.** Nesting `relations` three deep is free.
That is why the batch query does it: a linear franchise chain collapses from roughly one request
per entry to one per three. AniList throttles at **30 req/min** (down from 90), and a franchise
costs 3–10 requests.

**At most 50 ids per page.** The batch adapter pages accordingly.

**Nested nodes are topology, never content.** A nested `relations` node carries a reduced
projection — enough to reveal an id and label an edge, never enough to become a hydrated work.
`WorkStub` is that shape. Hydration only ever comes from top-level media.

**The status vocabulary is not ours.** AniList's `RELEASING` is our `ONGOING`, and
`NEW_SEASON_COMING` is derived by `summarizeFranchise` — the API never returns it.

**Genres are display labels.** AniList spells them "Slice of Life", "Sci-Fi", and adds new ones
over time. Our `Genre` vocabulary is our own; the mapper translates and **drops** anything outside
it. An unknown label is expected traffic, not a defect, and is never leaked raw.

**An airing series rarely reports its final episode count.** One Piece reports `episodes: null`
while airing. The fallback is the episodes already broadcast: next episode to air, minus one.

**AniList has no status for "quietly abandoned."** A dropped adaptation simply looks `FINISHED`.
`DE_FACTO_HIATUS` is inferred from `FINISHED` + source still publishing + last episode at least
`DE_FACTO_HIATUS_YEARS` ago. The window is deliberately conservative: two to three years is a
normal production gap between seasons, so a shorter one would flag the common case and the score
would lie.

**Id 9183 is dead.** AniList 404s it. Real Gintama is `918`. It is kept in the fixtures on purpose
as the not-found scenario, and older docs may still cite it wrongly.

---

## 🕸️ Traversal: what belongs to a franchise

**CHARACTER edges are not franchise membership.** Sharing a character is a cameo, not a
relationship. Measured against the recorded fixtures, following CHARACTER alone reaches Dragon Ball
Z and Toriko from One Piece — along with a Nissan commercial, an Arashi music video and a Lakers
promo — Level E from HUNTER×HUNTER, and Baccano! from Durarara!!, which are separate series sharing
an author's universe. The only genuine work it would have brought in is Fate/Zero Cafe. These edges
are recorded as topology and never bring a work into a franchise.

**OTHER edges are deliberately kept.** Unlike CHARACTER, OTHER carries real franchise content:
Attack on Titan's chibi theatres, Monogatari's _Naisho no Hanashi_.

**Related works must come from works we actually collected.** Because a batch response nests
`relations` three deep, it also reports edges leaving works that merely neighbour the franchise.
Taking every target regardless of origin walks two hops through a crossover into an unrelated
series: One Piece links by CHARACTER to a Nissin commercial, which links by CHARACTER to Sazae-san,
whose weekly episode then won the franchise's "next episode" pick. One hop is no better, only
nearer — it is how Dragon Ball Z joined One Piece, and how Durarara!!'s 2010 was dragged into a
franchise that ended in 2008. `related` feeds `endYear` and `nextAiringEpisode`, so a single cameo
can suppress the `DE_FACTO_HIATUS` window or hijack a premiere countdown.

**Timeline membership is reachability from the root, not merely touching a followed edge.**
Franchises routinely contain self-contained sequel chains — recap movies, chibi shorts — that
connect to the main line only through a SPIN_OFF or PARENT edge. Membership by edge type alone
merges them into the main timeline. The selected work is always present regardless, so the UI can
highlight it even when its format is excluded.

**Relations are read in both directions.** A chain is the same chain whether AniList models the
link as the sequel's PREQUEL or the prequel's SEQUEL.

**Sources: ADAPTATION, not ALTERNATIVE.** From an anime, ADAPTATION points at the work it was
adapted _from_; a manga drawn from that same book hangs off the anime as ALTERNATIVE. Taking every
source-kind node instead let Durarara!!'s three derived manga outvote its one light novel, so a
novel finished in 2014 was summarised as "Manga ongoing" — one of those manga is still running.

**A franchise can adapt several works of different kinds.** Monogatari draws on many light novels
plus a stray manga, so the source label reflects whichever kind predominates. Chapter and volume
counts are only shown when the franchise adapts exactly _one_ work — Monogatari's five separate
novels summed would be a number no book has.

---

## 📊 Summary and scoring

**The year range reads the timeline, and only the timeline.** Taking the end year from `related`
too built the range out of two different populations: searching HUNTER×HUNTER (1999) reported
"1999 – 2014", the end year belonging to the 2011 remake, while its episode count and score
described the 1999 series. `related` holds what does not advance the story — side stories, OVAs,
remakes — so it does not date the story either. A sequel _film_ does advance it, and
`DEFAULT_TIMELINE_FORMATS` already keeps films on the timeline.

**The average score covers seasons only.** Including movies and specials made a single-season
series report a score its one season never had. Guard rail worth keeping: for a single-season
series, the seasons average must equal that season's own score.

**Franchise status is evaluated most severe signal first.** `NOT_RELEASED` is checked before
`NEW_SEASON_COMING` so a franchise that has never aired is not advertised as having a sequel on
the way.

**An unfinished source does not penalise a stalled adaptation twice.** `DE_FACTO_HIATUS`'s base
score already accounts for the source outrunning the anime; applying the modifier as well would
charge it for the same fact twice.

**The score level follows the final number, not the situation**, so a modifier that lifts a
franchise into a better band lifts its label too.

**Quality is not part of the calculation.** The score answers "is now a good moment", not "is this
good". The AniList rating is shown beside the verdict and never enters the number. A closed story
is the only route to 100.

**Partial dates default to the reading that never overstates a wait.** An end date AniList only
knows to the year is read as December.

---

## 🧪 Testing

**Fixtures are recorded, never hand-written.** Hand-written mocks encode what we _assume_ the API
returns. Every defect in this list came from a shape nobody would have invented. Re-record with
`npm run record:fixtures` whenever `FRANCHISE_BATCH_QUERY` changes, and space recordings out — the
throttle is 30 req/min.

**`InMemoryAnimeRepository` models three hops, not one.** The real adapter reports edges leaving
the requested works _and_ edges leaving their immediate neighbours, because the query nests
`relations` three deep. A fake modelling only the first hop would hide the crossover leak the fake
exists to catch.

---

See also: [Architecture](./ARCHITECTURE.md) · [Scoring System](./SCORING-SYSTEM.md) ·
[Testing](./TESTING.md)
