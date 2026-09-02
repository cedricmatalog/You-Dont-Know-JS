# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The operator of this checkout: one person studying Kyle Simpson’s *You Don’t Know JS Yet* (2nd edition) in the browser, from the markdown on disk.

## Product Purpose

Make the six-book series readable as a book: library → book → chapter, with progress, search, type size, and day/night. Success is finishing a chapter with the language’s actual behavior in view, not skimming a tutorial.

## Positioning

A local study reader over this repository’s markdown. It is not Leanpub, Amazon, GitHub-rendered `.md`, or an official getify site. A neighboring docs theme could host pages; it could not truthfully claim it *is* these sources, in order, with Kyle’s examples still the text.

## Operating Context

- Run with `npm run dev` (Vite). Routes are hash-based: `#/`, `#/{book}`, `#/{book}/{chapter}`.
- Books live under `books/{get-started,scope-closures,objects-classes,types-grammar,sync-async,es-next-beyond}/`.
- Reading position and preferences persist in `localStorage` (`ydkjs-yet-reader`).
- Example checks: `npm run test:examples`.
- Confirmed: the books’ markdown is the source of truth. The app presents it; it does not rewrite Kyle.

## Capabilities and Constraints

**Can:** browse the shelf; open a book’s parts; read a chapter with a contents rail, code copy, figures, callouts, footnotes, and previous/next; search all six books; scale type; follow system/day/night.

**Must not:** treat the reader as a CMS, store, or second author of the series. The npm package is private (`ydkjs-yet`).

**Undecided:** whether WCAG 2.2 AA is a standing product floor (applied in one audit pass; not confirmed here).

## Brand Commitments

Name: **You Don’t Know JS Yet**. Author of the books: Kyle Simpson. The reader’s own chrome may say YDKJS / YDKJSY; it must not speak as Kyle.

The materials in `books/` are © 2019–2026 Kyle Simpson, CC BY-NC-ND 4.0 (stated in the repo README and the reader colophon). Future UI copy must not add sponsorship, sales, or “official” claims the sources do not make.

## Evidence on Hand

- Book text and figures: `books/**/*.md`, `books/*/images/*`
- Reader: `index.html`, `src/{app,catalog,markdown,store,styles}.css`
- Do not fabricate reviews, student quotes, completion stats, or a public URL.

## Product Principles

1. **The books are the product.** Chrome gets out of the way of a chapter.
2. **Present, don’t paraphrase.** If the markdown changes, the reader follows; the reader does not “improve” Kyle’s wording.
3. **Study in this checkout.** Design for one person at a desk (or phone) with the files local, not for a marketing landing or a multi-tenant app.
4. **Say what the control does.** Library, chapters, search, and errors name the object and the next step.
