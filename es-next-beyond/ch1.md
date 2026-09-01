# You Don't Know JS Yet: ES.Next & Beyond - 2nd Edition
# Chapter 1: The Moving Target

JS is not a language that shipped in 1995 and sat still. It is a language that ships **every June**.

That fact is recent, in language years. ES5 (2009) was a long pause after a painful decade. ES6 (2015) was a deluge. Since 2016, TC39 has cut a yearly release of ECMAScript: ES2016, ES2017, ... ES2026 and onward. "ES.Next" is not a version. It's the moving window of *what's about to be JS* -- proposals on the TC39 track that are close enough (or loud enough) that you'll meet them in blog posts, transpilers, and eventually engines.

This book is last in the series on purpose. The other five books are about the *grain* of the language: scope, objects, types, time. Those grains change slowly. The *surface* -- new syntax, new built-ins, new host contracts -- changes every year. You need both: a stable mental model, and a habit of reading the changelog without panicking.

Take your time anyway. A "tour of new JS" book is how people collect trivia and skip pillars. If you jumped here from *Get Started* Chapter 4's "you can read Book 6 early" permission, you're allowed -- but when Temporal talks about *types*, that's Book 4, and when `import()` returns a promise, that's Book 5. I'll point. You should follow the pointer.

## About This Book

Welcome to book 6 in the *You Don't Know JS Yet* series. The first edition's closing volume was *ES6 & Beyond*, written while ES6 was still landing. That book had to teach `let`, `class`, promises, and modules as *news*. Those are not news anymore. They have whole books in this edition.

So this volume is slimmer in pedagogy and heavier in *judgment*: what is JS *now* (Chapters 2--4), what is still a bet (Chapter 5), and how to keep learning when the June snapshot changes.

I will repeat some of *Get Started* Chapter 1 on purpose -- TC39, stages, "there is one JS." If that chapter felt like housekeeping, this is why it wasn't.

## TC39 And The Stages

TC39 is the committee (under Ecma) that specifies ECMAScript. Engine vendors, implementers, invited experts, and companies sit in the room. Features don't show up in Chrome because a blogger wanted them. They show up because a proposal survived a staged process:

* **Stage 0 -- Strawperson.** An idea. Not JS.
* **Stage 1 -- Proposal.** The committee is willing to discuss the problem. Syntax can still be thrown away.
* **Stage 2 -- Draft.** The committee expects something in this *problem space* to ship. Details will change. **Do not** write production code against stage 2 without a transpile flag you can delete.
* **Stage 2.7 / 3 -- Completeness / Candidate.** Spec text is solid; implementations and test262 tests are happening. Risk is dropping, not zero.
* **Stage 4 -- Finished.** In the next yearly spec. Engines may have already shipped it.

*Get Started* Chapter 1 covered this process. I'm repeating it here because *this* book will mention features at different stages, and I need you to feel the difference in your bones. Records & Tuples sat at stage 2 for years and were **withdrawn in 2025**. "Everyone knows that's shipping" is not a stage.

Let's make the stages personal. Optional chaining (`?.`) spent years looking "obvious" and still had to answer: does `null?.foo = 1` assign? (No -- it's a syntax error.) Does `delete a?.b` short-circuit? (Yes.) Those are grammar questions from Book 4, fought in the issue tracker, not on Twitter. Temporal spent a decade because *time* is a types question that also has to survive calendars, time zones, and `Date` still existing. Decorators spent a decade because the first three syntaxes collided with `class` fields and `#` privacy -- Book 3's object model, not a missing `@`.

When a feature is stuck, it is usually stuck on a *pillar*, not on bikeshedding a keyword. That's why I keep sending you backward in the series.

| WARNING: |
| :--- |
| Babel plugins and TypeScript syntax are not the language. They are *bets*. Some bets pay (optional chaining). Some don't (the bind operator `::`, decorators in their first three syntaxes, Records/Tuples). When you adopt a proposal early, you are taking on a migration. Own that. Don't pretend it's already JS. |

## Yearly ES vs "JS6"

There is no JS6. There is no ES8 in casual speech that I will honor. The spec is **ECMAScript 2025**, **ECMAScript 2026**, etc. Engines implement *features*, not "the 2024 box" as an all-or-nothing switch. Your users' browsers may have Temporal and lack some other ES2026 item, or the reverse.

Feature-detect, or consult tables (caniuse, MDN BCD), or set a baseline ("we support the last two versions of evergreen browsers + this Node") and transpile/polyfill the delta. Don't sniff `typeof Temporal` in six places and also ship a 200KB polyfill "just in case" without measuring.

## What's In This Book vs The Other Books

I will **not** re-teach:

* `let` / `const` / modules / closure -- *Scope & Closures*
* `class` / `this` / `Proxy` -- *Objects & Classes*
* coercion / `??` / `?.` grammar -- *Types & Grammar*
* promises / `async`/`await` / workers -- *Sync & Async*

I **will** cover:

* post-ES6 syntax that is now "just JS" but still misused (Chapter 2)
* collections and iteration APIs that grew up after ES6 (Chapter 3)
* **Temporal**, which reached stage 4 in 2026 and replaces most honest uses of `Date` (Chapter 4)
* the *horizon*: pipeline operator, pattern matching, composites, decorators, and how to watch them without betting the company (Chapter 5)

If a feature is already in the language at the time you read this, treat the chapter as a deep look, not a preview. If it has since shipped or died, that's the point of a moving book. Check the spec year, then read anyway -- the *design tensions* (why equality is hard, why dates are hard, why pipes have two camps) outlive the particular syntax.

## Backwards And Forwards

JS's north star is: **don't break the web.** Existing code keeps running. New syntax has to parse without turning old programs into different programs (that's why `?.` and `??` took care, why `await` is contextual, why `import` isn't just a function). New APIs can usually land as added globals and methods -- those are easier than new punctuation.

That's also why some "obvious" features take a decade. The committee is not only asking "is this pretty?" It's asking "does this make `foo <bar> baz` mean something new in a million existing files?"

`async` could not be a contextual keyword in sloppy scripts without breaking `async = 1` as an identifier in some programs -- so `async function` is a pair, and `await` is only legal in async functions (and modules, later). That's "don't break the web" as grammar. Temporal could *not* replace `Date` in place, because every `new Date()` on the web would change meaning. So we got a new namespace sitting next to the old object. That's "don't break the web" as types.

When people complain that JS is slow to get X, they sometimes mean "my other language has X." They rarely mean "I have a web-compatible grammar in mind." Both complaints can be valid. Only one of them is TC39's job.

## How To Read ES.Next

1. **Prefer MDN + the spec over Twitter threads.** Threads are how rumors become "JS now does X."
2. **Read the proposal's README and the *objections*.** The issue tracker is the feature's real documentation.
3. **Try it in a throwaway file**, not in your payment service.
4. **Ask what pillar it touches.** New syntax that changes *values* (new primitives, new equality) is the most expensive kind. New methods on `Array.prototype` are cheap. Temporal is a new namespace of objects -- medium-expensive, carefully designed.
5. **Stay slightly behind the bleeding edge on purpose.** Shipping last year's stage 4 is how you look fast without being a beta tester for the language.

The language will keep moving. Your job is not to memorize every proposal. Your job is to keep the three pillars -- and the event loop -- so solid that a new method or a new `Temporal.Instant` is just another value with a behavior, not a reason to throw out your mental model.

### See The Stage

Optional chaining is the worked example I want in your bones, because it *looked* done for years and still had homework.

The *problem*: `record.location.city` throws if `location` is missing. People wrote `record.location && record.location.city` (*Types & Grammar*: ToBoolean), which is the wrong question if `location` could be `0` or `""`.

The *syntax fight*: `?.` had to parse next to `?` ternary, `??`, and existing `?.` in TS/CoffeeScript folklore. `null?.foo = 1` -- assign through a maybe-missing base -- is a **syntax error**, not a no-op. That was a grammar decision (Book 4), not a taste decision.

The *stage*: by the time engines shipped it, the corners were in test262. You can use `?.` tonight as JS.

Contrast Records: same "everyone knows it's coming" energy, **withdrawn**. Contrast Temporal: same long timeline, **stage 4**, because it added a *namespace* instead of changing `Date`. Contrast pipes: still stage 2 as of 2026 -- Hack vs F#, topic token, `await` in the pipe. **Tonight: `var`s.**

When you read "JS is getting X," ask: is X a new method (`Object.groupBy` -- cheap), new syntax (`?.` -- medium, parse-sensitive), or a new kind of value (`#{ }` -- expensive, can die)? Cheap things ship. Expensive things need a decade or a funeral.

### One Classroom, Three Baselines

Kyle's workshop site has to run in last-year Chrome, this-year Firefox, and a LTS Node that teaches the same repo. That is not "ES2026." That is three *lists*.

```js
function classroomBaseline() {
    return {
        optionalChaining: true,          // syntax: transpile if Node LTS lags
        nullishCoalescing: true,         // same
        objectGroupBy: typeof Object.groupBy == "function",
        temporal: typeof Temporal == "object",
        iteratorHelpers:
            typeof Iterator == "function" &&
            typeof Iterator.from == "function"
    };
}
```

Walk it. `?.` and `??` are **syntax**. `typeof` cannot see them -- if the file parsed, you have them, or a transpiler gave you an equivalent. `Object.groupBy` is an **API**. `typeof` is the right check in *this* realm. Temporal is an **API namespace**. Same.

If `classroomBaseline().temporal` is `false` in Node LTS and `true` in Chrome, you do not "use Temporal." You pick: polyfill the namespace, or keep `Date` at the Node edge and convert at the browser edge, or bump the LTS. That sentence is this book. The feature list in Chapters 2--4 is useless if you cannot say which of those three you meant.

A bundler that rewrites `?.` but does not polyfill `Object.groupBy` will fail in the old browser *at runtime*, after a successful build. Syntax and API are different bets. Mix them up and you will debug "it works on my machine" for a week.

### The June Snapshot Is Not A Box

ECMA-262 cuts a yearly PDF. Engines do not flip a switch labeled `2026`. V8 ships `Object.groupBy` on a Chrome train. SpiderMonkey ships Temporal on a Firefox train. JavaScriptCore has its own calendar. Node lags or leads depending on the V8 it bundled.

So "we require ES2026" is not a test you can run. A test you *can* run is: these 12 features, these polyfills, this browserslist. Write it in the README next to the Node version. Update it when you drop a browser -- not when a keynote happens.

| NOTE: |
| :--- |
| test262 is the language's own test suite. Engine "we shipped X" means tests passed, not that your favorite blog's mental model of X passed. When a feature feels wrong, read the tests. They are more honest than the explainer. |

### Don't Break The Web, With A File

```js
var async = 1;               // identifier, sloppy script, pre-2017
```

If `async` had become a keyword everywhere, this file would throw. So `async` is only special in `async function` / `async () =>` / module `await`. That's not pretty. That's millions of scripts.

```js
new Date("2022-07-07");
```

If Temporal had *become* `Date`, this would stop meaning "an instant the host guessed." Birthdays would move. So Temporal is `Temporal.*`. `Date` stays a bad instant.

Keep those two snippets. Every time someone says JS is slow to get a feature, ask whether the feature wanted to *change* one of them. If yes, it will take a decade or a new name. If no (`Array.prototype.at`), it can ship in a year.

### What "Yearly ES" Does Not Mean

It does not mean your users got a language drop on June 1. It does not mean you should put `es2026` in a job posting as if it were a dialect. It does not mean last year's book is wrong.

It means: the spec PDF has a date, the proposals repo has stages, engines have trains, and *you* have a baseline. This book is the habit of keeping those four from collapsing into one word, "modern."

`let` was news in *ES6 & Beyond*. It is a chapter in *Scope & Closures* now. Optional chaining was a proposal when some of you learned JS. It is a paragraph in Chapter 2 now. Temporal was a decade of slides. It is Chapter 4 now. Records were slides too. They are a funeral in Appendix A.

That rotation is the job. You cannot freeze the surface. You can freeze the pillars. If a new feature scares you, it is usually because a pillar is still fuzzy -- not because June betrayed you.

### A Proposal Card You Can Reuse

Print this on paper. Fill it once per feature you almost adopted:

```
Name: ______________________________
Stage today: 0 / 1 / 2 / 2.7 / 3 / 4 / withdrawn
Pillar: scope / objects / types / time / host-modules
Kind: method / syntax / new value / new equality
Don't-break-the-web risk: changes existing production? Y/N
Tonight: wait / polyfill / transpile / userland helper
Delete-by date if transpile: __________
```

Do `Object.groupBy` as a warm-up. Stage 4. Objects/collections. Method. No grammar change. Polyfill or wait. Easy.

Do `?.` . Stage 4. Types/grammar. Syntax. Parse-sensitive (`?.` assign illegal). Transpile or wait. Easy now, was a bet in 2019.

Do Temporal. Stage 4 (2026). Types + time. New namespace. `Date` unchanged. Polyfill until baseline. Medium cost.

Do records `#{ }`. Withdrawn. Types + equality + syntax. Would have changed what a value *is*. Userland string keys. The card's "withdrawn" box exists so you remember conference energy is not a stage.

Do pipes. Stage 2 (check). Syntax. Two camps. Wait. Named `var`s tonight.

If you cannot fill the pillar line, you are not ready to bet the payment service. Go back to Books 2--5 until the pillar has a name. That is not gatekeeping. That is this series' entire point, applied to a moving surface.

Keep a dated note in the repo (`BASELINE.md` or a paragraph in README). "We assume `?.`, `??`, `Object.hasOwn`, `Promise.allSettled`. We polyfill Temporal. We do not transpile pipes." When someone pastes a stage-2 snippet in review, you have a document to point at instead of a vibe.

### Host APIs Are Not The June PDF

`fetch`, `rAF`, `indexedDB`, `node:fs` -- none of those are ECMA-262. They return promises or take callbacks *on* the event loop this series already taught. A new host method (`scheduler.yield`) can land in Chrome without being in the ES2026 PDF. A new ES method (`Iterator.from`) can be in the PDF without being in your Node.

This book still cares, because you will meet both in the same file. Ask Chapter 1 of *Sync & Async*: which queue? once or many? what abort token? If you can answer, you don't need a seventh YDKJS title for each host. If you cannot, a new `navigator.locks` blog post will feel like a new language.

`typeof fetch == "function"` is a host detect. `typeof Iterator.from == "function"` is a language detect. Same `typeof`. Different owners. Your baseline list should say which.

### "JS6" Was A Feeling, ES2015 Was A Spec

People still say JS6 when they mean "arrows, classes, promises, modules." Those are *Scope & Closures*, *Objects & Classes*, and *Sync & Async* now. The feeling was real: ES2015 was a deluge. Yearly releases after that were smaller on purpose -- so the language could digest. This book is the digesting, not another deluge.

If a coworker says "we should write JS6," they mean a 2015 baseline. If they say "we should write ES.Next," they might mean stage 2. Ask which. Then fill the proposal card.

### The First Edition Had To Teach News; This One Teaches Judgment

*ES6 & Beyond* walked `let`, `class`, promises, modules as incoming weather. This edition's Books 2--5 absorbed that weather. If you only read *this* Book 6, you will collect Temporal trivia and skip why `===` on two `PlainDate`s is identity. The pointer back is mandatory, not polite.

I will keep sending you to coercion when `?.` meets `0`, to `this` when a decorator moves a method, to the event loop when `import()` returns. That's consistency with Books 1--2: a map, then a deep pillar book, not a dump of release notes.

### Take Your Time Anyway

A "what's new in JS" thread is a snack. This chapter is the chewing. If you skimmed the stages because you already "know TC39," fill the proposal card for one feature you shipped in the last year. If you cannot name the pillar, the skim was the problem. Stay here until the card is boring. Then Chapter 2 will feel like syntax instead of magic.

The rest of this book is judgment practice: syntax you already have (2), collections (3), Temporal (4), horizon bets (5). If Chapter 1 felt like housekeeping, good -- *Get Started* Chapter 1 was housekeeping too, and it was the foundation. Same series move, last book.

### You Already Know How To Read This Book

*Get Started* told you not to binge. *Scope & Closures* told you to draw scopes. This book tells you to date your baseline and to distrust stage numbers that aren't 4. The pedagogy is the same: slow, named mechanisms, classroom programs, pointers to pillars when a feature is stuck.

If you came here first because "modern JS" sounded like a shortcut, you've now been told -- several times -- that it isn't. Go back. Come forward again. The moving target only makes sense if the target does.

Kyle, in a workshop, once asked me to "just list the new APIs." I listed Temporal and `groupBy` and pipes in the same breath. He asked which of those he could put in `printSummary` on Monday. Only then did the list split into language, polyfill, and don't. This chapter is that split, written down.

If you still want a list, MDN's JavaScript release notes exist. If you want a *habit*, you just read it. Use it.

### Questions From The Workshop Floor

"Is Temporal in JS?" -- If your baseline's engines have `typeof Temporal == "object"` and you didn't only polyfill a stub, yes. The spec year on the cover of this PDF is not the answer.

"Can I use pipes?" -- Not in `printSummary` until stage 4 *and* your baseline. Named `var`s until then.

"Why didn't Records ship?" -- New primitives + new equality + new literals. Expensive. Withdrawn. String keys tonight.

"Is `es2026` a tsconfig target I should set?" -- That's a compiler's downlevel map, not TC39. It might emit helpers for syntax you don't have. It will not polyfill Temporal by itself. Don't confuse `target` with a browser baseline.

"Should we rewrite Date to Temporal in one PR?" -- Convert at the edges. Instant in the DB. ZonedDateTime at the form. Don't `toDate()` everything in the middle or you built `Date` again.

Those five questions are this chapter. If you can answer them without looking up, Chapter 2 is next. If you cannot, fill one proposal card slowly instead of skimming the stage list again.

Stay with the card until it's boring. Then the rest of the book is examples, not a new religion. That's how *Get Started* Chapter 1 treated "what is JS" -- housekeeping that turned out to be the whole series' frame.

The card, the baseline file, the kind-of-change row (Appendix A), and the pointer back to pillars -- that's all of Chapter 1. Everything after is examples of those four habits. If you skip to Temporal because it's new, you'll treat it like `Date` with extra methods. If you skip to pipes because they're pretty, you'll transpile stage 2. Don't skip this chapter.

## Fill The Card Once, Slowly

I want you to do this with a real tab open, not from memory. Pick `Object.groupBy`. Write:

```
feature: Object.groupBy
stage: 4 (ES2024)
pillar: objects / collections (Book 3, this book's Chapter 3)
kind: new method
tonight: polyfill or feature-detect
delete-by: when our Safari column is green
do not: Object.groupBy(rows, obj => obj)  -- ToString keys
```

Now pick pipeline (`|>`). Same template:

```
feature: pipeline operator (Hack-style)
stage: 2  (look it up -- this line ages)
pillar: grammar / "how we write a chain"
kind: new syntax
tonight: named var tmp = ...
delete-by: stage 4 AND baseline -- not "when the plugin is popular"
do not: Babel plugin as production JS
```

Two cards. Same five blanks. Different tonight. If those two cards feel identical, you are still reading stage numbers as permission. They are not permission. They are a maturity label for a *proposal*. Stage 4 is the only number that means "this is JS." Even then, your *engines* might not have it yet. That's the second axis: spec vs baseline.

`classroomBaseline` is not a library. It's a comment at the top of the workshop files:

```js
// classroomBaseline:
//   syntax: ?. ??
//   methods: Object.groupBy (polyfill)
//   namespaces: Temporal (polyfill)
//   not: |>
function printSummary(student) {
    var course = student.enrollment?.courses?.[0] ?? "none";
    console.log(student.name, course);
}
```

The function is boring on purpose. Chapter 2 will make `?.` interesting. Chapter 3 will make `groupBy` interesting. Chapter 4 will make Instant interesting. Chapter 5 will make "not: `|>`" interesting. This chapter only makes the *comment* interesting -- because without it, the rest of the book is a catalog you will binge and forget.

That's the *Get Started* Chapter 1 move again: before surveying JS, we said what JS *is*. Before surveying June, we say what "in JS" *means*.

Chapter 2 is a tour of syntax that's already here, and that I still see people using as if it were magic (or avoiding as if it were dangerous). Neither is the grain.

Take ten minutes. Fill *one* card for a feature you used last week. If you cannot name the stage without guessing, that's the lesson -- not a failure of memory, a failure of the habit. The rest of this book assumes you will do that when a blog says "JS now does X." Chapter 2 will not remind you again at every `?.`. This chapter is the reminder.

```js
// one card, filled slowly -- do this on paper
// feature:
// stage:
// pillar:   (scope | objects | types | time | host/module)
// kind:     (method | syntax | namespace | primitive | host | module)
// tonight:
// delete-by:
```

Blank lines are the point. A catalog chapter would have filled them for you. This chapter refuses. Chapter 2 starts when those blanks bore you.
