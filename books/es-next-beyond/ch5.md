# You Don't Know JS Yet: ES.Next & Beyond - 2nd Edition
# Chapter 5: The Horizon

A horizon feature is one that might be in your JS before the next edition of this book, or might be a footnote next to Records & Tuples. I will not pretend I can tell which. I will tell you **what problem it thinks it solves**, **where it is in the process**, and **what to do tonight**.

Stages listed here are as of **2026**. Recheck [tc39/proposals](https://github.com/tc39/proposals) before you bet a codebase.

## Pipeline Operator (`|>`) -- Stage 2

Nested calls read inside-out:

```js
result = trim(capitalize(fetchName(user)));
```

A pipe reads left-to-right. JS's current design (Hack-style) binds the left-hand value to a **topic** placeholder in the right-hand expression (the token has been `%` in drafts; it is not sacred):

```js
// sketch -- token and exact grammar may change
result = user |> fetchName(%) |> capitalize(%) |> trim(%);
```

There's a long, loud history: F# pipes (`value |> fn` meaning `fn(value)`) vs Hack pipes (topic in an arbitrary expression). TC39 has repeatedly not chosen F# pipes. If you learned pipes in Elixir or Elm, the JS one will annoy you. If you wanted `obj |> .map(fn)` without extra parens, that's the Hack motivation.

**Tonight:** write helper functions and intermediate `var`s. They are readable. Do not ship a Babel plugin for stage 2 pipes in a bank app.

| NOTE: |
| :--- |
| Stage 2 is a draft of a problem space. The token (`%` or otherwise) can still change. A plugin you cannot date-delete is a fork of JS, not a preview of it. |

Why the fight lasted so long: F# pipes compose *functions*; Hack pipes compose *expressions*. JS already has two call syntaxes (parens and tagged templates), methods (`obj.foo()`), and `await`. A pipe that only works with unary functions makes `await fetch(url)` and `obj.foo(1, 2)` awkward. A pipe that injects a topic token makes `user |> foo(%)` obvious and `user |> foo` (implicit call) a different language. TC39 picking Hack is a bet that JS is an expression language, not a point-free FP language. You don't have to like the bet. You do have to notice it is a *language* bet, not a missing `lodash.flow`.

If you want left-to-right today:

```js
var name = fetchName(user);
var cap = capitalize(name);
var result = trim(cap);
```

Three bindings. Readable. No plugin. The "clutter" is the program's actual data flow, named.

## Pattern Matching -- Stage 1

`switch` compares with `===` and doesn't destructure. Nested `if`s do. Pattern matching (various drafts: `match (x) { when { type: "ok", value } => ... }`) wants algebraic-data-style deconstruction in the language.

It has been stage 1 for a long time because **pattern matching is a language inside the language**: exhaustiveness, guards, protocol vs structure, interaction with `===` vs `==` vs branding, objects vs maps, and how much `class` hierarchy it should see.

**Tonight:** use `switch` on a discriminant field, or a dictionary of functions, or a tagged-union helper you own. If you need exhaustiveness, TypeScript `switch` + `never` is the practical tool -- that's a checker, not JS.

Here's the helper I mean -- not a proposal, just JS you can ship:

```js
function match(value,handlers,unexpected) {
    var tag = value && value.type;
    var fn = handlers[tag];
    if (typeof fn != "function") {
        if (typeof unexpected == "function") {
            return unexpected(value);
        }
        throw new Error("unhandled: " + tag);
    }
    return fn(value);
}

var msg = { type: "student", id: 73 };

match(msg,{
    student(v) { return fetchStudent(v.id); },
    error(v) { return Promise.reject(v); }
});
```

This is a dictionary of functions plus a tag. Pattern matching in the language would destructure *and* check *and* maybe exhaust. Until it exists, do this: one field you control, a table of behaviors, a loud default. Nested `if (x.type == "student" && x.id)` trees are how the exhaustiveness story gets lost.

## Composites -- Stage 1 (Successor To Records/Tuples)

Records & Tuples wanted **primitive**, deeply immutable, `===`-by-contents structured values (`#{ }` / `#[ ]`). Withdrawn in 2025: new primitives and new equality are among the most expensive possible changes.

Composites aim at a narrower pain: **structured Map/Set keys** with defined equality, as **objects**, not primitives. The design has already shifted (including toward interning so that `===` might work by canonical identity). Syntax, symbol keys, `WeakMap` behavior -- all in flux.

**Tonight:** for value-keys, pick one:

* encode a canonical string key (`id:123`)
* intern objects yourself (`Map` from serialized form to object)
* use a library with a comparator

Don't write `#{ }` in production. *Types & Grammar* Chapter 3 covers the types lesson.

The withdrawal is the teaching, not the syntax. TC39 was asked to add new primitives *and* a new equality story *and* new literal punctuation that had to parse next to existing `{ }` / `[ ]`. Any one of those is a multi-year fight. All three at once is how a stage-2 favorite dies in 2025 after years of conference talks. When a blog says "JS is getting records next year," ask which of those three fights is actually over. Composites ducked the primitive fight on purpose. That's why they might live. It's also why they won't feel like `#{ }`.

## Decorators -- Stage 3 (Check Current)

Covered in Chapter 2 as "almost absorbed." Horizon-wise: standard decorators vs the ones already in your framework compiler. The risk is **lock-in to a transform**, not the idea of annotating a class field.

**Tonight:** if you don't need them, don't add them. If Angular requires them, that's a framework tax, not a JS tax.

## Explicit Resource Management (`using` / `await using`)

Deterministic dispose, like `try..finally` you can't forget:

```js
{
    using handle = openFile(path);
    // handle[Symbol.dispose]() runs at block exit
}
```

This is the correct grain for files, locks, and other "must close." It reached late stages in the mid-2020s; hosts/engines may still be rolling it out.

**Tonight:** `try..finally`. When `using` is in your baseline, migrate the `finally` that only exists to call `.close()`.

The symbol protocol is the interesting part -- you can implement it on your own objects today in engines that have `using`, and you can still write the `finally` by hand where they don't:

```js
function openRoster(path) {
    var closed = false;
    return {
        path,
        [Symbol.dispose]() {
            if (closed) return;
            closed = true;
            // fs.closeSync or whatever
        }
    };
}
```

`Symbol.asyncDispose` pairs with `await using`. Don't mix a sync dispose with async I/O -- you'll hide a promise. Same grain as Chapter 5 of *Sync & Async*: if close is later, the using must be `await using`.

## More Module Graph

Expect continued work on:

* **import attributes** expanding to more module types
* **module integrity / hashes**
* **deferred / lazy module evaluation** beyond `import()`
* **JSON / bytes modules** as first-class

The module system is still the most important "organization" feature in JS (*Scope & Closures* Chapter 8). New syntax here is worth tracking more than pipes, because it changes how apps *load*, not how a line *reads*.

## Wasm, Hosts, And "Is This Even JS?"

A lot of "the future of JS" is not ECMA-262. It's:

* **WebAssembly** sitting next to JS, sharing memory, faster for number crunching
* **WinterCG / "web-ish" runtimes** (Cloudflare Workers, Deno, Node's web APIs) aligning `fetch`, streams, URL
* **HTML / CSS / DOM** features that show up in your JS because the host put them there

YDKJSY is about **JS the language**. When a problem is "this loop is too slow," wasm or a worker may be the answer, not a new operator. When a problem is "this date math is wrong," Temporal is the answer, not wasm.

## How To Read A Horizon Feature

Chapter 1's card still works when the feature is not in the language yet. Fill it anyway. The difference is the **delete-by** date is "stage 4 *and* baseline," not "next Tuesday."

Walk `using` as an example, slowly:

* **Problem:** `try..finally { file.close() }` is easy to skip on a new `return` in the middle of the block.
* **Mechanism:** a block-scoped binding whose `Symbol.dispose` / `Symbol.asyncDispose` runs on exit, including throw.
* **Pillar:** that's *Types & Grammar*'s completion (`return` in `finally` still wins) plus *Sync & Async*'s "close is later, so `await using`."
* **Tonight:** `try..finally`. The symbol protocol is something you can implement on a stub object in a REPL *if* your engine has `using`. If it doesn't, the `finally` is the whole feature.
* **Don't:** transpile a stage-3 `using` into a bank app so the file looks modern.

Pipes get the same card: problem is nested calls; mechanism is a topic token; pillar is still grammar (ASI, `await` in the RHS, comma operator fights); tonight is a named `var`; don't is Babel.

Pattern matching: problem is nested `if` / `switch` on shape; mechanism is a new production that can coerce and bind; pillar is *Types & Grammar* (what does a match do to `==` folklore?); tonight is functions that return discriminants; don't is "we match like Rust now."

| NOTE: |
| :--- |
| If you cannot name the pillar, you are not adopting a feature. You are collecting syntax. *Get Started* Chapter 1 already said that about JS itself. Horizon features fail the same test more often, because the explainer is prettier than the spec. |

### Decorators Are A Compiler Tax Until They Aren't

A decorator that only exists after `tsc` / Babel is a dialect. Standard decorators (when your *engine* has them) are JS. Those are different baselines. Frameworks that require `@Component` are charging a framework tax; that is allowed, and it is not "JS has decorators." Put the transform on `BASELINE.md` with a delete-by date, or admit it has none.

Tonight without the tax: a function that receives the class or the method and returns it. You already know `Object.defineProperty`. A lot of decorator demos are that function with an `@` in front.

### `using` And The Close You Were Going To Forget

The interesting part is not the keyword. It is that dispose runs on *every* exit: `return`, `throw`, `break` from an outer labeled block if the `using` is in scope. The `finally` you keep forgetting in a classroom loader that opens a file, `await`s `fetchStudent`, and returns early on a missing id.

`await using` is for when close itself is later (`file.close()` that returns a promise). Mixing them -- sync `using` around async close -- hides a job. *Sync & Async* Chapter 5: if it is later, `await` it.

| WARNING: |
| :--- |
| `Symbol.dispose` that throws replaces the original error the same way `finally` can. If you needed both, `error.cause` or a suppressed-error list (the proposal has one; check the year you are reading). Don't log in dispose and assume the `try` error is still the one the caller sees. |

## How To Watch Without Drowning

1. Read the **TC39 agendas and notes** occasionally, not every tweet from the meeting week.
2. Follow **one** good filter (ECMAScript Daily, the proposals repo changelog, MDN's "JavaScript" release notes).
3. When a feature hits **stage 4**, decide if it belongs in *your* baseline in 6--12 months (engine coverage, polyfill cost).
4. When a feature is **stage 2 or below**, treat articles about it as *design fiction*. Educational. Not a sprint ticket.
5. Keep the pillars. A new operator still coerces. A new collection is still an object. A new async API still sits on the event loop.

### Read One Proposal This Afternoon

Open the explainer, not a Twitter thread. Write the Chapter 1 card while you read: problem, stage, engines, tonight, delete-by.

For Temporal (already stage 4 -- this is practice on a feature you *can* ship): the problem is "Date is an instant pretending to be a calendar." The spec is a namespace of types, not a better `getMonth`. Tonight is polyfill until your baseline has `typeof Temporal == "object"`. Delete-by is a date on `BASELINE.md`.

For a stage-2 pipe: the problem is "nested calls read inside-out." The spec is a grammar fight (Hack vs F#). Tonight is named `var`s. Delete-by is "when stage 4 *and* our engines parse it," not "when the plugin hits 1.0." If you cannot fill tonight without a compiler, you are not previewing JS. You are forking it.

Spend the rest of the afternoon on *one* abstract operation the explainer names. Temporal's is `disambiguation`. Pipes' is how the topic binds. Decorators' is evaluation order vs `[[Define]]`. If the explainer has no operation you can name, it is still a slide deck.

### After Stage 4, The Work Is Engines

Stage 4 means "this is JS." It does not mean Safari 17 has it. The yearly snapshot is a PDF. Your users are engines.

The year after Temporal's stage 4 is not a year of writing `Date` anyway "until everyone upgrades." It is a year of an adapter: `toInstant` at the log, `PlainDate` at the birthday, `Date` at the driver. The year after `Object.groupBy` is deleting lodash `groupBy` in the modules whose browserslist is green, not rewriting the app in a weekend.

Keep a "delete this polyfill" date. When it passes and caniuse is still red for a browser you support, move the date. Do not let the date pass in silence so the polyfill becomes folklore.

Records & Tuples went stage 2, got conference talks, then withdrew. The intern table in Chapter 3 is still the program. Userland that named the *problem* outlives the token. That is why this chapter lists problems first and stages second.

## You Still Don't Know JS *Yet*

That's not an insult. It's the series title, and it's still true.

The language will grow. Some growth will delight you (Temporal should). Some will annoy you (the pipe token). Some will vanish. The parts that *won't* vanish are the parts Books 2--5 spent hundreds of pages on: lexical scope, the prototype link, value types, and the difference between now and later.

If you can see a new proposal and ask, "which pillar does this touch? which abstract operation? which queue?" -- you don't need this sixth book updated every June. You can read the proposal yourself.

The goal is not to know JS. It is to **keep knowing** it.

Appendix A is the field card -- including the `BASELINE.md` this repo keeps at the root, so the practice has a file, not just a sermon. Appendix B is practice. Go write some code -- in last year's JS, unless your baseline says otherwise.
