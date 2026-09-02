# Baseline — You Don't Know JS Yet reader (this repo)

Dated: 2026-09-02. Update when we drop an engine, not when June happens.

## Engines we assume

* Node 22+
* Safari 18+, current Chrome / Firefox / Edge

## Syntax (no transpile)

* optional chaining `?.`
* nullish coalescing `??`
* `async` / `await`, `class`, modules

## Methods — polyfill until DATE

* `Object.groupBy` / `Map.groupBy` — native in the engines above; no polyfill
* Temporal — `@js-temporal/polyfill` (dev: `temporal-polyfill`) until engines we ship have `typeof Temporal == "object"`. Delete-by: 2027-06-01 or when caniuse is green for our support table.

## Namespaces

* `Temporal` — see above. Do not `new Date()` next to an Instant for the same log line.

## Not yet

* pipeline operator (`|>`) — stage 2 as of this writing. Named `var`s.
* pattern matching — stage 1
* Composites — stage 1 (successor to Records & Tuples, which were withdrawn April 2025)

## Hosts

* This reader is a static Vite app. No `SharedArrayBuffer`. Workers are examples in the book, not this build.

## Yearly ritual (June)

1. Open this file.
2. For each method now in our engines: delete the polyfill.
3. For each proposal: update the stage on the card, not production source.
4. If a proposal died: keep the userland helper.
