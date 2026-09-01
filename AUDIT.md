# Content Audit — You Don't Know JS Yet (2nd ed.)

**Date:** 2026-09-02 · **Scope:** all 71 markdown files across 6 books (~178,000 words)
**Method:** structural scripting + full read of new content + empirical execution of code claims
(Node 26.8.1, `temporal-polyfill`) + web verification of dated TC39 claims.

---

## 0. What's actually here

Commit `9eb1850` ("Update README and chapter files…") added **~8,755 lines** of new prose that
completes books 3–6, which upstream were unfinished. Books 5 (*Sync & Async*) and 6
(*ES.Next & Beyond*) are **entirely new**; books 3 and 4 got new appendices **and** new sections
spliced into Kyle Simpson's existing chapters (`objects-classes/ch2.md` +246 lines,
`types-grammar/ch3.md` +229 lines, filling former `// TODO` and "Work in progress" markers).

Word split: **57,059 words new** vs **121,009 words** original-author.

This audit separates **new content** (where all substantive defects are) from **pre-existing**
upstream defects.

**What holds up:** 27 of the code claims I executed were correct, including all `==` corner pairs,
`NaN`/`-0`, `parseInt` vs `Number`, array holes, generators/`yield*`/`.return()`, the ch4 `run`
helper, iterator helpers, `Object.groupBy`, `Map` identity keys, prototype-link demos, and the
`Predicting The Loop` solution (`A G D F B C E`). The two load-bearing dated claims are **correct**:
Temporal reached Stage 4 in **March 2026**, and Records & Tuples were **withdrawn in April 2025**.

---

## 1. Confirmed technical errors (code that does not do what the book says)

Every item below was executed. Severity: **H** = the stated output is wrong or the snippet crashes.

### H1 — `es-next-beyond/ch4.md:245-264` — flagship Temporal example returns the wrong answer
`Temporal.PlainMonthDay` has **no `.month` property** (only `.monthCode` and `.day`).

```
suzyBirthday.month  →  undefined
isBirthdayWorkshop  →  false      (book asserts "// true")
```
This is the chapter's central "See The Type" worked example. Fix: compare `.monthCode` (`"M07"`),
or use `Temporal.PlainDate`/`PlainMonthDay.from(...).equals(...)`.

### H2 — `es-next-beyond/ch4.md:583-585` — DST arithmetic result is wrong
`01:30` Chicago on 2026-03-13 + `{minutes: 90}` crosses the spring-forward gap:
```
actual   → 04:00:00
book says → "// 03:00 -- not 03:00 plus a mystery, and not 02:00"
```
01:30 CST (−06:00) = 07:30Z; +90 min = 09:00Z = **04:00** CDT (−05:00).

### H3 — `es-next-beyond/ch4.md:86-96` — the days-vs-hours DST demo uses the wrong date
The snippet starts at `2022-03-13T08:00`, which is **already after** the 2:00 AM transition:
```
zdt                 → 2022-03-13T08:00:00-05:00
zdt.add({days:1})   → 2022-03-14T08:00:00-05:00   ← book: "the offset changed" (it did not)
zdt.add({hours:24}) → 2022-03-14T08:00:00-05:00   ← book: "9:00 on the wall" (it is 8:00)
```
Both annotations are false as written. Starting at **2022-03-12T08:00** produces exactly the
contrast the section wants (`+1 day` → 08:00 −05:00; `+24h` → 09:00 −05:00). Line 77's
`new Date("2022-03-13T08:00:00-06:00")` is likewise mislabeled "Chicago" — Chicago is −05:00 then.

### H4 — `es-next-beyond/ch4.md:345-350` — comment contradicts itself and the runtime
```
chicago.toPlainDate().equals(paris.toPlainDate())  →  true
```
The book's comment says `// false` and then explains, correctly, that both *are* July 7.

### H5 — `es-next-beyond/ch4.md:475-477` — `PlainDate.until` with `largestUnit:"hours"` throws
```
RangeError: Invalid largestUnit: hour; must be between day-year
```
The book presents it as returning "still a date-to-date duration."

### H6 — `es-next-beyond/ch4.md:498-504` — code says 90 **hours**, prose says 90 **minutes**
`workshop.until(workshop.add({ hours: 90 }))` → `PT90H`. Prose: "Ninety minutes of workshop as a
duration." Should be `{ minutes: 90 }`.

### H7 — `es-next-beyond/ch4.md:199-224` — `Intl.DateTimeFormat` cannot format a `ZonedDateTime`
```
fmt.format(workshop)          → TypeError: Cannot format ZonedDateTime
fmt.formatToParts(workshop)   → TypeError: Cannot format ZonedDateTime
fmt.format(workshop.toInstant()) → "Thursday, July 7 at 11:00 AM"   (works)
```
This is a deliberate spec decision (ambiguity between the ZDT's zone and the formatter's `timeZone`),
not an implementation lag — but the book hedges with "test the actual `format` output." Also, the
claimed output `"Thursday, July 7, 2022, 11:00 AM"` includes a year that the given options never
requested.

### H8 — `es-next-beyond/ch4.md:55` — `Temporal.TimeZone` / `Temporal.Calendar` do not exist
Both classes were **removed from the proposal in 2024** (issues #2853/#2854) when the callable
time-zone/calendar protocols were dropped. They are not "types you usually don't construct by hand";
they are absent. `typeof Temporal.TimeZone === "undefined"`.

### H9 — `es-next-beyond/ch4.md:286-297` — the DST-gap example does not throw by default
`ZonedDateTime.from({...2:30 on Mar 13})` with **default** options uses `disambiguation:"compatible"`
and returns `2022-03-13T03:30:00-05:00`. The book leads with "`// RangeError`". (The `reject`
variant later in the chapter *is* correct.)

### H10 — `types-grammar/ch5.md:608-633` — the chapter's climactic ASI example is a SyntaxError
```
SyntaxError: Unexpected token ':'   (at `name: "Suzy"`)
```
`{ id: id, name: "Suzy" }` as a *block* parses as label `id:` + expression statement
`id, name: "Suzy"` — and `name: "Suzy"` is not a valid expression. The book claims
`console.log(getStudent(73))` logs `undefined`. The program does not parse at all.
(The single-property version in `types-grammar/apB.md:168` **is** correct — that's the fix.)

### H11 — `sync-async/ch1.md:312-329` — "Time Is A Hidden Input" example throws
```
TypeError: Cannot read properties of undefined (reading 'name')
```
`students.shift()` removes Suzy (id 73) **before** the 100 ms timeout runs, so
`students.find(s => s.id == 73)` is `undefined` and `student.name` throws. The book claims it logs
`Kyle Suzy`. The section's point survives; the demonstration does not.

### H12 — `sync-async/ch3.md:361` — `Promise.finally` does not swallow the value
```
Promise.resolve("Suzy").finally(() => "dummy")  →  "Suzy"
(function(){ try { return "try"; } finally { return "finally"; } })()  →  "finally"
```
The book: *"Same rule as `try..finally`… Don't `return` a dummy value from `finally` 'to be safe.'
You just ate Suzy."* Only a **throw or a rejected promise** overrides; a plain return is ignored.
The book's own preceding sentence states this correctly, then the closer contradicts it.

### H13 — `es-next-beyond/ch2.md:50-55` — `new record.Ctor?.()` is a SyntaxError
```
SyntaxError: Invalid optional chain from new expression
```
The book says "Calls and `new` have the same rule" and annotates it "skip `new` if Ctor is nullish."
Optional chaining is prohibited in a `new` expression.

### H14 — `objects-classes/apA.md:241` — `Object.assign` does **not** strip `super`
```
source.greet()  → "src+base"
Object.assign({}, source).greet()  → "src+base"   (no throw)
```
`[[HomeObject]]` travels with the function. The book: *"`Object.assign` copied methods lose `super`…
it is a syntax error or a throw."* The real hazard is that `super` keeps resolving against the
**original** home object — surprising, but not an error.

### H15 — `types-grammar/apB.md:177-180` — ASI exercise-2 solution is wrong
```
var a = 1
var b = 2
[a,b].forEach(...)
→ TypeError: Cannot read properties of undefined (reading 'forEach')
```
The solution offers "a syntax error, **or** with ASI after `2`, an array forEach." Neither happens:
`[` continues the expression, giving `2[(a,b)]` → `2[undefined]` → `undefined`, then `.forEach`
throws at **runtime**. (The advice — "put the semicolon" — is right; the diagnosis is not.)

### H16 — `sync-async/ch2.md:188-195` — the Zalgo demo's two calls both miss the cache
As literally written, back-to-back `printSummary(73)` calls both take the 50 ms path:
```
actual:                      book claims:
after fetchStudent false     after fetchStudent false
after fetchStudent false     student callback false
student callback false       -----
student callback false       student callback false   ← NOW, before after
                             after fetchStudent true
```
The claimed second block only occurs once the cache is warm — i.e. from a later turn. The snippet
needs the second call inside a `setTimeout` (which the text asks the reader to do *elsewhere*, at
`apB.md:82`, but not here).

### Medium
- **`types-grammar/apA.md:140`** — calls `===` "SameValueX". No such abstract operation; `===` is
  **IsStrictlyEqual**, and **SameValueZero** is what `Map`/`includes` use. Inventing a fifth name in
  a chapter about naming abstract operations precisely is self-defeating.
- **`sync-async/ch4.md:331`** — "the generator mistake `await` makes a syntax error." Forgetting
  `await` is not a syntax error.
- **`es-next-beyond/ch4.md:587`** — "`minutes` … vs calendar `hours`". `hours` is an **exact** time
  unit in Temporal, not a calendar unit; only years/months/weeks/days are calendar units.
- **`types-grammar/ch3.md`** (inserted section) — `("Kyle").foo = 1` **throws** in strict mode
  (which the series assumes); the text says it "appears to work … and still doesn't persist."
  Same paragraph: *"in sloppy non-strict details"* is a garbled phrase.
- **`types-grammar/ch3.md`** (inserted) — `new RegExp(\`[^@]+@${domain}\`)` with
  `domain = "getify.com"` leaves `.` unescaped, i.e. the exact string-to-regex hazard the adjacent
  WARNING is about, unremarked.
- **`types-grammar/apB.md:230`** — "holes preserved in the result **on most engines** — check yours."
  This is spec-mandated, not engine-dependent.
- **`sync-async/ch6.md:77`** — the rAF walk-through is muddled: the async continuation resumes as a
  microtask **after the rAF callback but before that frame's paint**, so the "put the card down,
  browser paints, then resume" narration doesn't match the actual ordering.

---

## 2. Structural defects

### S1 — Chapters and appendices continue after their own conclusion *(systemic, all new content)*
Every new chapter and appendix ends its argument, writes a "next chapter" transition, and then keeps
going for dozens more lines. Worst cases:

| File | Concludes at | Content continues to |
|:---|:---|:---|
| `es-next-beyond/ch5.md` | L156 `## You Still Don't Know JS *Yet*` — **the series' capstone** | L305; the last book of the series now ends on "Five Tonight Snippets, Not Five Plugins" / "Go write some code." |
| `types-grammar/ch5.md` | L600-602 "you have the third pillar… The next book, *Sync & Async*…" | L659 — a whole `##` section appended after the book's closing transition |
| `es-next-beyond/ch2.md` | L285 "Chapter 3 is a tour of…" | L301 — 6 more paragraphs after the transition |
| `es-next-beyond/ch3.md` | L287 "Chapter 4 is the big one…" | L301 |
| `objects-classes/apA.md` | L212 "Appendix C is your turn to type." | L306 — 5 more sections |
| `objects-classes/apB.md` | L296 "Then Appendix C." | L308 |
| `sync-async/apA.md` | L244-246 "That's Appendix A." | L301 — 3 more closers follow |

Counts of redundant closing paragraphs per file run **4–8**. `es-next-beyond/ch1.md` additionally
nests 15 `###` sections (including "Questions From The Workshop Floor") under the unrelated `##`
"How To Read ES.Next" — the heading hierarchy is wrong.

### S2 — Near-verbatim duplicated sections
- `objects-classes/apB.md` — **`## \`new.target\` And The Forgotten \`new\`` (L206)** and
  **`## \`new.target\` And The Missing \`new\`` (L274)**: same topic, same `Student`/`Guest` example,
  both listed separately in `toc.md`.
- `objects-classes/apA.md` — `## See The Link, Not The Copy` (L87) and
  `## Live Link, Walked Once More` (L272): the same mutate-the-prototype-after-construction demo.
- `es-next-beyond/apA.md` — three sections restated near-verbatim at the end:
  "Stage Numbers Are Not Versions" (L188 ≈ L289), "Caniuse Is Not test262" (L192 ≈ L292),
  "Transpilers Are Dialects" (L196 ≈ L294). The sentence *"If you cannot name the deletion date,
  you are not adopting a proposal"* appears verbatim at L198 and L294.
- `types-grammar/apA.md` — `document.all` covered at L230 and again at L298.
- `es-next-beyond/ch3.md` — the two "fail-closed tests" sentence appears at L267 and L301.

### S3 — Formatting-convention violations
The series renders callouts as two-row markdown tables (`| NOTE: |` / `| :--- |`). Five callouts in
the new appendices are **bare text**, which will render as body prose:
`es-next-beyond/apA.md:252,289` · `sync-async/apA.md:289` · `types-grammar/apA.md:298` ·
`types-grammar/apB.md:299`. All five sit in the appended tail blocks from S1.

Callout density also diverges sharply: Kyle's `types-grammar/ch1–ch4` carry 18–26 callouts each; the
new `sync-async/ch5`, `es-next-beyond/ch2–ch5` carry **zero**.

### S4 — TOC drift
- `es-next-beyond/toc.md` abbreviates five Chapter 5 headings, dropping the `-- Stage N` suffixes
  that are part of the actual headings, and lists only 2 of that chapter's 5 `###` subsections.
- `objects-classes/toc.md` — `Extending the MOP` vs chapter's `Extending The MOP` (case).
- `sync-async/toc.md` lists `See The Offload` at `##` level, matching the file — but that heading is
  `##` while every sibling "See The …" section in the book is `###`.

Pre-existing (upstream) TOC drift, for completeness: `get-started` ch1/ch3 title case,
`scope-closures` ch1/ch6/ch8.

### S5 — Books 4, 5, 6 have unsigned "forewords"
`get-started`, `scope-closures`, `objects-classes` have real guest forewords signed by Brian Holt,
Sarah Drasner, and Rick Waldron with title/affiliation blocks (and `src/catalog.js` records the
`by:` field for exactly those three). The forewords for *Types & Grammar*, *Sync & Async*, and
*ES.Next & Beyond* are unsigned, unattributed, and written in the book's own voice — they are
prefaces, not forewords. `sync-async/foreword.md` also shares a verbatim sentence with
`sync-async/ch1.md:249` ("Log `"now"` and `"later"` until the order bores you.").

### S6 — Authorial voice break
`es-next-beyond/ch1.md:218`: *"**Kyle**, in a workshop, once asked me to 'just list the new APIs.'"*
The series is written in first person **as Kyle Simpson**; "Kyle" is also the running example
student. Here the narrator is a third party being asked a question *by* Kyle. This one sentence
breaks the authorial persona of the whole series.

### S7 — Continuity gaps in the running example
`fetchStudent` is the book-long running example but is defined incompatibly across chapters:
- `sync-async/ch1.md` — callback style, looks up a `students` array
- `sync-async/ch3.md` — promise style, **hardcodes** `name: "Suzy"` for every id
- `sync-async/ch4.md`/`ch5.md` — use a promise style that *does* look up by id, **never defined**

Consequence: `sync-async/ch5.md:190-195` claims `forEach` over `[73, 14]` logs
`got Suzy` / `got Kyle`, which requires the undefined variant; with ch3's definition it would log
`got Suzy` twice. Similarly `objects-classes/apB.md` defines `Student` three different ways
(L152 function, L187 class, L209 function) within one appendix.

### S8 — Miscount
`objects-classes/apC.md:304` — "That's **five** exercises:" then names five *plus* two more; the
appendix has **seven**.

---

## 3. Style divergence from the original author (measured)

Frequency per 100k words, new content vs. Kyle-authored:

| Construction | New | Original | Ratio |
|:---|---:|---:|---:|
| `That's the …` | 148.9 | 17.3 | **8.6×** |
| `-- not …` | 47.3 | 6.6 | **7.2×** |
| `the grain` | 43.8 | 4.1 | **10.7×** |
| `Name the …` | 31.5 | 2.4 | **13.1×** |
| `on purpose` | 59.5 | 9.9 | **6.0×** |
| `Predict` | 42.0 | 16.5 | 2.5× |
| `Don't skip` | 17.5 | 2.4 | 7.3× |
| `That's the whole …` | 14.0 | **0** | — |
| `That's Chapter …` | 21.0 | **0** | — |
| `Measure` | 15.7 | **0** | — |

Constructions absent from 121k words of the original author yet frequent in the new material:
"That's the lesson", "That's the design", "That's the shape", "That's experience",
"the part that sticks", "in the good way", "is not decorative", "Two verbs", "Walk it".

The tell is the terminal aphorism: nearly every paragraph in the new content ends on a short
declarative summary. That cadence — plus S1's stacked closers — is what makes the new books read
differently from books 1–2 even where the technical content is sound.

---

## 4. Pre-existing (upstream) defects — not introduced by the new content

Verified present at `044120e`, before the content commit:

- `types-grammar/ch2.md:469` — `[^INTLCollatorApi]` cited, never defined
- `types-grammar/ch4.md:732` — `[^ObjectValue]` cited, never defined
- `types-grammar/ch3.md` — `[^CompositesProposal]`, `[^FundamentalObjects]`,
  `[^RecordsTuplesProposal]` defined, never cited
- `types-grammar/ch4.md` — `[^NumberConstructor]`, `[^StringConstructor]`, `[^ToNumeric]` defined,
  never cited
- `objects-classes/foreword.md:6` — empty link target: `[You Don't Know JS Yet: Objects & Classes]()`
- `types-grammar/ch2.md:1063-1065` and `ch4.md:1882-1884` — duplicate footnote definitions
- TOC title-case drift in `get-started` and `scope-closures` (S4 above)

Clean across all 71 files: code-fence balance (0 unbalanced), image references (0 broken),
relative links (0 broken), callout table separator rows (0 malformed). The `// ..TODO..` markers in
`apB`/`apC` files are intentional exercise stubs, not unfinished text.

---

## 5. Recommended order of work

1. **H1–H9** (Temporal chapter). Nine confirmed errors in one chapter, including the flagship
   example. Re-derive every annotated result against a polyfill before re-publishing.
2. **H10, H11, H15, H16** — worked examples that crash or produce different output than claimed.
   These are the ones a reader typing along will hit.
3. **H12–H14** — assertions that are simply false and will teach the wrong rule.
4. **S1** — cut the appended tail blocks. This is one editorial pass and it fixes the
   most-visible quality problem, including the series ending on the wrong note.
5. **S2, S4, S3** — delete duplicate sections, re-sync TOCs, convert the five bare callouts.
6. **S5–S8** — attribution, voice, and continuity.
7. Pre-existing footnote/link defects (§4) — worth an upstream-style fix pass, independent of the above.

---

## Sources

- [Temporal Reaches Stage 4 — Igalia](https://www.igalia.com/2026/03/13/Temporal-Reaches-Stage-4.html)
- [TC39 Advances Temporal to Stage 4 — Socket](https://socket.dev/blog/tc39-advances-temporal-to-stage-4)
- [Record & Tuple: "Proposal is withdrawn" — tc39/proposal-record-tuple#394](https://github.com/tc39/proposal-record-tuple/issues/394)
- [Remove `Temporal.TimeZone` class and protocol — tc39/proposal-temporal#2853](https://github.com/tc39/proposal-temporal/issues/2853)
- [Remove `Temporal.Calendar` class and protocol — tc39/proposal-temporal#2854](https://github.com/tc39/proposal-temporal/issues/2854)
