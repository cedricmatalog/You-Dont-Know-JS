# You Don't Know JS Yet: ES.Next & Beyond - 2nd Edition
# Appendix A: Exploring Further

The main chapters are a field guide. This appendix is the stuff I cut so Chapter 1 could stay a habit instead of a committee memoir -- and that will still bite you when a blog says "JS now does X."

## There Is Still One JS

*Get Started* Chapter 1 insisted: there aren't six JSes, one per ES20xx box. Engines implement *features*. Your Node might have `Promise.withResolvers` and lack Temporal. Your browser might have Temporal and lack iterator helpers.

"We use ES2026" is a slogan. A baseline is a *list*: which features you assume, which you polyfill, which you transpile, which you feature-detect. Write the list down. Update it when you drop a browser, not when June happens.

```js
var hasTemporal = typeof Temporal == "object";
var hasGroupBy = typeof Object.groupBy == "function";
```

Those checks are honest for *this* realm. They are not a substitute for caniuse when the question is "do *users* have it?" Ship a polyfill for Temporal if you need the types and your baseline is behind. Don't `typeof` six times in a hot path *and* ship a 200KB polyfill "just in case."

## Polyfill vs Transpile vs Wait

Three different bets:

* **Polyfill** -- a library that adds a missing *API* (`Array.prototype.at`, `Object.hasOwn`, Temporal). Runtime cost. Behavior should match the spec, including the ugly corners. Good polyfills are tests against test262, not a blog gist.
* **Transpile** -- a compiler rewrite of *syntax* (`?.`, `??`, `class` fields) into older syntax. Your users never see the new punctuation. You pay at build time. You also pay when the transform is *wrong* (decorators, three times).
* **Wait** -- don't use it until your baseline has it native. The underrated option.

APIs can polyfill. Syntax cannot (not without a compile step). That's why optional chaining showed up in codebases years before Temporal: Babel could rewrite `?.`; it could not invent a correct calendar.

Don't polyfill `Proxy`. Don't polyfill `SharedArrayBuffer` with a fake that isn't shared. Don't transpile stage-2 pipes into a bank app. The tool is not the judgment.

## `Date` Could Not Be Fixed In Place

Chapter 4 is Temporal. The appendix question is: why a new namespace instead of making `Date` less awful?

Because **don't break the web**. `new Date("2022-07-07")` already means something -- several somethings, depending on era and host. Changing it to a `PlainDate` would silently shift birthdays. Changing month indexes to 1-based would shift everything else. Adding a time zone field to a value that is *only* an instant would make `getHours()` even more of a lie.

So `Date` stays. Temporal sits beside it. Interop is `epochMilliseconds`. That is not committee cowardice. That is the same north star as `==` still existing and `var` still existing.

When a proposal wants to *change* an existing production or an existing object's meaning, ask: how many GitHub lines become different programs? If the answer is "millions," you will get a new name, not a fixed old one.

## Proposal Archaeology: Records & Tuples

I will keep using this example until it bores you, because it is the healthiest scar on the language.

For years, conference talks treated `#{ }` / `#[ ]` as incoming primitives: immutable, `===` by contents, `Map` keys that weren't strings. Stage 2. Implementations in transpilers. Then **April 2025**: withdrawn. New primitives plus new equality plus new literals next to `{ }` / `[ ]` was three expensive fights at once.

Composites (Chapter 5) ducked the primitive fight. That is why they might live, and why they will not feel like records. If your architecture assumed `#{ }` would ship, you now have a migration that is *your* problem, not TC39's.

The lesson is not "never believe proposals." It is: **stage 2 is a draft of a problem space.** Pin a Babel plugin only if you can delete it. Prefer encoding a string key tonight.

## Import Attributes Are Integrity, Not Convenience

```js
await import("./config.json", { with: { type: "json" } });
```

`type: "json"` is not "please guess MIME." It is a claim the module graph can check. A JSON module is not a script. Attributes exist so you cannot `import` a JSON document as JS (or the reverse) by accident -- or by an attacker swapping Content-Type.

When more types land (bytes, CSS in some hosts), the `with` clause is the same contract. Don't strip attributes in a bundler "to make it a plain object" unless you understand you just left the module graph.

## Iterator Helpers Are Not Array Methods

Chapter 3 said lazy vs eager. The exploring-further version: **closing**.

If you `break` out of a `for` of an iterator-helper pipeline, `.return()` should propagate to the underlying iterator (a generator, a file reader). If a library's helper *doesn't* close, you leak. Arrays don't have this problem; they're already in memory.

```js
function* ticks() {
    try {
        yield 1;
        yield 2;
        yield 3;
    }
    finally {
        console.log("closed");
    }
}

for (let n of Iterator.from(ticks()).take(1)) {
    console.log(n);
}
// 1
// closed   -- if the helper forwards .return()
```

If `"closed"` doesn't print, the helper is a pretty `.map` and a bad citizen. Prefer `for` + generator, or a helper you have tested for teardown.

## Intl Is Data, Not A String Template

`Intl.NumberFormat("de-DE").format(1234.5)` is `"1.234,5"` -- or whatever the CLDR snapshot in *that engine* says. The algorithm is specified; the *data* (how Germany groups digits this year) updates with the host. Don't snapshot a formatted string in a unit test and call it a spec test. Test the *options you passed*, or test with a locked locale and accept engine drift.

Temporal values go to Intl for display. ISO `toString()` is for machines. Mixing them is how you show `"2022-07-07T16:00:00Z"` to Suzy and call it localized.

## How To Read A Proposal In An Afternoon

1. README: problem statement, status badge, **rejected alternatives**.
2. Explainer examples: copy one into a throwaway file (polyfill or nightly).
3. Open issues sorted by comment count: that's the fight.
4. Ask the pillar question (Chapter 1). If you can't name the pillar, you don't understand the proposal yet.
5. Write three sentences in your team's language: we wait / we polyfill / we transpile, until ____.

That's more useful than memorizing the pipe token.

## Nightly vs Shipped vs Documented

MDN can document a method before every engine has it, and engines can ship a method before MDN's BCD row is green. The spec PDF can list a feature in ES2026 while Safari ships it in 2027. None of these sources is lying. They are *different clocks*.

Your clock is the users. Browserslist / Node LTS / "last two evergreens" is a product decision. A proposal README is not.

When you copy a snippet from a blog dated June, check the *engine* it was run in, not the spec year in the title. `Object.hasOwn` blogs from 2022 were correct for then-Chrome and wrong for then-enterprise-Electron. The code did not expire. The *baseline* did.

## `globalThis` And Realms

A realm is a global environment: an iframe, a worker, `vm.runInNewContext` in Node. `instanceof Error` can fail across realms because each realm has its own `Error` constructor. `Error.isError(x)` exists to be the brand check. `Array.isArray` already was. `typeof` is not.

`globalThis` is the global object of *this* realm. Don't assign to it as a dump. Don't assume `window` in a worker (`self` / `globalThis`). Feature-detect host objects on `globalThis` when you mean the current realm, not a parent frame.

## JSON.parse Reviver And Thenables

Chapter 3 warned about `{ then(){} }` on a class. JSON.parse can produce a plain object with a `"then"` *string* key whose value is not a function -- usually harmless. A custom reviver that turns `{ "then": "ok" }` into something callable is how you invent a thenable worm from the network. Don't. Revivers should produce data.

`JSON.parse(text, reviver)` runs the reviver depth-first. Returning `undefined` *deletes* the key. That's a types operation wearing a parse API. Prefer producing `null` if you meant empty, unless you meant delete.

## WeakMap Keys Are Not A Privacy Language

`WeakMap` is GC-aware identity. It is not `#private`. Anything with the map can `.get(obj)`. Module-scoped WeakMaps (*Objects & Classes* Appendix B) are a convention: only that module holds the map. That's encapsulation by *scope* (Book 2), not by the engine hiding slots. `#x` is the engine hiding slots. Don't mix the two in your head when a proposal says "private."

## Bytes Are Not Strings

`btoa` / `atob` are host legacy for Base64 of *binary strings*, not UTF-8 text. `TextEncoder` then Base64 of bytes is the modern path (and still often a host/util, not ECMA-262). Don't `btoa(JSON.stringify(student))` and call it unicode-safe. That's *Types & Grammar* (string vs bytes) showing up in a "web API" costume.

## Feature Detection Without Lying

```js
function hasGroupBy() {
    return typeof Object.groupBy == "function";
}

function hasTemporalInstant() {
    return typeof Temporal == "object" &&
        typeof Temporal.Instant == "function";
}
```

Detect the *thing you call*. `typeof Temporal == "object"` is not proof `ZonedDateTime.from` exists -- a half polyfill can put a namespace there. Detect the method. Don't detect `"ES2026"` via a version string you invented.

`try { new Function("return 1_000"); return true; } catch { return false; }` is a syntax detect. Ugly, honest for separators if you refuse a transpile. Prefer the compile step.

## The Explainer Is Not The Spec

Proposal explainers are teaching documents. They omit corners. The spec text and test262 are the contract. When `?.` assign was debated, Twitter had a vibe and the grammar had a production. Ship the production.

If you only read explainers, you will be shocked by `delete a?.b`, by Temporal overflow `constrain`, by iterator `.return()` on `break`. Read one test file for a feature you actually use. That's this appendix's homework that isn't the proposals repo.

## When To Fork A Proposal

You shouldn't. If you need the problem solved tonight, solve it in userland with the grain of the current language (`match()` dictionary, string keys, `try..finally`, named `var`s). Forking a Babel plugin for stage-1 syntax makes *you* the committee. That's a full-time job you already have.

## `with` Type JSON Modules And CSP

JSON modules via `import ... with { type: "json" }` fail closed if the attribute is stripped or if the file is actually JS. That is integrity. A bundler that inlines JSON as a plain object *removes* that check -- fine for a trusted build, a different program than a browser module graph. Don't call both "the same import."

WASM modules, CSS modules (hosts), and bytes modules will grow the same `with` clause. The exploring-further lesson is: **the attribute is part of the specifier's meaning**, not a hint you can drop "for compatibility" without noticing you changed the graph.

## Ship Last Year's Stage 4

A practical cadence that matches "slightly behind":

1. Feature hits stage 4 and a yearly spec.
2. Wait until two evergreen engines (or your Node LTS) have it, *or* ship a spec-faithful polyfill you can delete.
3. Add it to `BASELINE.md`.
4. Only then use it in `printSummary`.

Skipping to step 4 is how Records-shaped confidence gets into production. The appendix is not anti-new. It is anti-*undated* new.

## `import.meta` Is Host Metadata

```js
new URL("./roster.json", import.meta.url);
```

`import.meta.url` is the module's URL, so relative files resolve the same in a browser path and a `file:` Node path (hosts permitting). `__dirname` is CJS. Don't mix them in a module you haven't decided is ESM. Attributes (`with { type: "json" }`) pair with this graph. Appendix A of *Scope & Closures* is modules as scope. This appendix is modules as *load format*.

## Equality Proposals Are The Expensive Kind

Every time a proposal wants `===` to mean "same contents," remember Records. `Object.is`, `SameValueZero` (Map keys), `==` (coercive), `===` (identity, with NaN/-0 wrinkles) are already four stories. A fifth has to fight all four plus the web. Prefer a function `equalClassroom(a,b)` you own. You can delete it when the language grows one that matches. You cannot delete a shipped `===` change -- which is why it didn't ship.

## Stage Numbers Are Not Versions

"ES Stage 3" is not ES2023. Stage 3 is a proposal maturity. ES2023 is a yearly snapshot of *finished* (stage 4) features plus editorial work. Mixing the words is how a stage-3 decorator blog becomes "we upgraded to ES2023 decorators" in a standup. Say "stage 3 decorators" or "ES2026 Temporal." Don't say "ES.Next 3."

## Caniuse Is Not test262

BCD / caniuse answers "do users' engines have this method?" test262 answers "does this engine implement the spec corners?" A polyfill can make caniuse-shaped code run and still fail a Temporal overflow test. For classroom `?.`, caniuse is enough. For Temporal in production, you want both -- or a polyfill that cites test262.

## Transpilers Are Dialects Until You Delete Them

A Babel plugin for a stage-2 feature is a dialect your repo speaks. `BASELINE.md` should list it next to Node version. When the plugin's grammar diverges from what ships (pipes, decorators -- twice), the dialect becomes a migration. Budget the deletion the day you add the plugin. If you cannot name the deletion date, you are not adopting a proposal. You are forking the language.

## A Year In The Life Of A Feature

Take `Object.groupBy` as a calm story, then Records as the other ending.

**groupBy:** problem (group rows without a `for` + `[]` ritual) → stage drafts → engines ship a method on `Object` / `Map` → test262 → yearly spec → caniuse goes green → you add it to baseline → you delete the lodash `groupBy` import. Cheap kind (method). No new values. No new `===`.

**Records:** problem (value-equal structured keys) → years of `#{ }` talks → new primitives + equality + literals → withdrawn. The problem remains. Composites pick a narrower, object-shaped path. Your intern table stays.

Every feature you almost adopt is one of those two movies. Appendix A's job is to make you *classify the movie* before you buy a ticket. Methods are groupBy. New values are Records until proven otherwise. Syntax is `?.` -- medium, parse-sensitive, usually fine once stage 4. Host APIs are `fetch` -- not even this book's spec.

If your team only remembers "JS gets nicer every June," they will star in the Records movie by accident. If they remember this appendix, they will ship `groupBy` and wait on pipes. That's the grain.

When you're tempted to skip this appendix, that's usually the week a blog said "JS now does X." Fill the card anyway. Ten minutes. Then ship `printSummary` without X if X isn't stage 4 in your baseline.

## Kinds Of Change, One Page

* **New method** (`Object.hasOwn`, `Array.prototype.at`, `Object.groupBy`): cheapest. Polyfill. Detect with `typeof`.
* **New syntax** (`?.`, `??`, `_` in numbers): needs parse support or a transpile you can delete. Detect by the file compiling.
* **New namespace of objects** (Temporal): medium. Polyfill until baseline. Don't mutate `Date`.
* **New primitive / new `===`** (Records): most expensive. Assume it can die. Userland keys.
* **New host API** (`fetch`, `scheduler`): not ECMA-262. Same event-loop questions as Book 5.
* **New module graph rule** (import attributes): load integrity. Don't strip in the bundler without noticing.

If you classified a blog post into one row before you paste the snippet, this appendix worked.

Copy the kinds list into `BASELINE.md` if that helps the team. Methods you polyfill. Syntax you transpile-or-wait. Namespaces you polyfill. Primitives you don't bet. Hosts you queue-question. Modules you don't strip. Six rows. That's the appendix you can put on a wiki without the rest of this book.

## Walk One `printSummary` Through The Card

Take a function you already know from Book 5 and pretend a coworker pasted four "modern JS" upgrades into it in one PR:

```js
function printSummary(student) {
    var course = student.enrollment?.courses?.[0] ?? "none";
    var grouped = Object.groupBy(student.tags ?? [], function(t){
        return t.track;
    });
    var when = Temporal.Now.instant();
    // coworker also wants: student.tags |> groupBy(t => t.track)
    console.log(student.name, course, grouped, when.toString());
}
```

Fill the card **before** you argue about style.

* `?.` / `??`: **syntax**, stage 4 for years, Chapter 2. In baseline if your engines parse it. Kind: new syntax. Tonight: use it at *real* boundaries (`enrollment` may be missing). Don't `?.` a number and swallow a programming error.
* `Object.groupBy`: **method**, stage 4, ES2024. Kind: new method. Tonight: polyfill or `typeof Object.groupBy == "function"`. Chapter 3: if `track` is an object, you wanted `Map.groupBy`.
* `Temporal.Now.instant()`: **namespace**, Temporal stage 4 (March 2026). Kind: new namespace of objects. Tonight: polyfill until `typeof Temporal == "object"` is true *in the engines you ship*, not only in the spec year on this PDF. Don't `new Date()` "for now" next to an Instant -- that's two types for one log line.
* `|>` pipe: **syntax**, still a proposal (Hack-style, stage 2 as of this writing -- look it up). Kind: new syntax you cannot parse. Tonight: named `var grouped = ...`. Delete-by: when stage 4 *and* baseline. Not "when Babel has a plugin."

Four lines of source. Four different rows. That's why Appendix A exists as a *page*, not a vibe. The coworker thought they shipped "ES.Next." They shipped one baseline feature, one polyfillable method, one polyfillable namespace, and one dialect. Your job is to split the PR.

NOTE:
If `grouped` keys look like `"[object Object]"`, you didn't fail Temporal. You failed Chapter 3. The card would still have said "method, cheap." Cheap features still have types.

## What "Delete The Plugin" Looks Like

```js
// BASELINE.md (excerpt)
// engines: Node 22+, Safari 18+
// syntax: optional chaining, nullish coalescing (no transpile)
// methods: Object.groupBy -- polyfill in older Safari until DATE
// namespaces: Temporal -- @js-temporal/polyfill until DATE
// not yet: pipeline operator (stage 2) -- named vars
// delete-by: Temporal polyfill -- 2027-06-01 or when caniuse is green
//            for our support table
```

A date on a polyfill is a promise to look. A plugin without a date is a fork. *Get Started* told you JS has many faces (engine, transpiler, linter). This appendix tells you which face you are looking at when a blog says "you can use X now."

If you cannot fill that excerpt for your repo, you do not have a baseline. You have a pile of `package.json` ranges. Chapter 1 asked for the file. This appendix is the rows that go in it.

Appendix B is practice. The proposals repo is the homework that never ends.

When the next June snapshot lands, do not re-read this book from page one. Open `BASELINE.md`. For each row that turned green in your engines, delete a polyfill. For each proposal that jumped a stage, update the card -- not the production code. For each proposal that died, keep the userland snippet. That's the yearly ritual this appendix is for. *Get Started* had "many faces." This book has "many Junes." Same habit. Different calendar.

```js
// yearly ritual (June)
// 1. open BASELINE.md
// 2. for each method now in engines: delete polyfill
// 3. for each proposal: update stage on the card, not the source
// 4. if a proposal died: keep the userland helper
typeof Object.groupBy == "function";
typeof Temporal == "object";
// |> still a parse error until stage 4 AND baseline
```

That's the appendix as a checklist. Chapter 1 asked you to fill a card once. This page asks you to fill it every June.

NOTE:
"ES Stage 3" is not a yearly snapshot. Stage is proposal maturity. ES2026 is a snapshot of *finished* features. Mixing the words is how a stage-3 blog becomes "we upgraded to ES2026 X" in standup. Say the stage or say the year. Don't say "ES.Next 3."

caniuse answers "do users' engines have this method?" test262 answers "does this engine implement the spec corners?" A polyfill can make caniuse-shaped code run and still fail a Temporal overflow test. Classroom `?.` can live on caniuse. Production Temporal wants both -- or a polyfill that cites test262. That's the last row of the kinds list wearing QA.

A Babel plugin for stage-2 syntax is a dialect your repo speaks. Budget the deletion the day you add it. If you cannot name the deletion date, you are not adopting a proposal. You are forking the language. Methods you polyfill. Syntax you wait-or-transpile-with-a-date. That's the kinds list as a hiring question.

groupBy shipped. Records died. Two movies. Classify the next blog post before you paste the snippet. If you cannot, re-read "Kinds Of Change, One Page." That's the appendix's fail-closed test.

Six rows. A card. A June ritual. If a coworker pastes a stage-2 snippet into `printSummary`, you now have a page to send instead of a vibe. That's exploring. Appendix B is practicing the same judgment with code.

The kinds list is also a code-review comment: "which row is this?" If the author cannot answer, the snippet does not land. That's the grain of this book wearing a checklist.
