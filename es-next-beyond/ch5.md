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

That's a dictionary of functions plus a tag. Pattern matching in the language would destructure *and* check *and* maybe exhaust. Until it exists, this is the grain: one field you control, a table of behaviors, a loud default. Nested `if (x.type == "student" && x.id)` trees are how the exhaustiveness story gets lost.

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

## How To Watch Without Drowning

1. Read the **TC39 agendas and notes** occasionally, not every tweet from the meeting week.
2. Follow **one** good filter (ECMAScript Daily, the proposals repo changelog, MDN's "JavaScript" release notes).
3. When a feature hits **stage 4**, decide if it belongs in *your* baseline in 6--12 months (engine coverage, polyfill cost).
4. When a feature is **stage 2 or below**, treat articles about it as *design fiction*. Educational. Not a sprint ticket.
5. Keep the pillars. A new operator still coerces. A new collection is still an object. A new async API still sits on the event loop.

## You Still Don't Know JS *Yet*

That's not an insult. It's the series title, and it's still true.

The language will grow. Some growth will delight you (Temporal should). Some will annoy you (the pipe token). Some will vanish. The parts that *won't* vanish are the parts Books 2--5 spent hundreds of pages on: lexical scope, the prototype link, value types, and the difference between now and later.

If you can see a new proposal and ask, "which pillar does this touch? which abstract operation? which queue?" -- you don't need this sixth book updated every June. You can read the proposal yourself.

That's the goal. Not to know JS. To know how to **keep knowing** it.

A closing inventory, as of the year on the cover of *your* engine, not mine:

* **Stage 4 / in the yearly spec:** treat as JS once your baseline has it. Temporal (2026) is the expensive one in this book. Iterator helpers, `Object.groupBy`, `Promise.try`, `Error.isError` -- check BCD, then use them.
* **Stage 3:** decorators, maybe `using`. Pin the *transform* if a framework requires it. Don't mix three decorator dialects.
* **Stage 2:** pipes. Read the fight. Don't ship the plugin.
* **Stage 1 / withdrawn:** pattern matching, composites, records. Learn the *problem*. Encode a string key. Write `match()` as a dictionary.

### See The Wait

A team I will not name shipped a Babel plugin for F# pipes in 2021 because a conference talk said "it's coming." The grammar that actually moved was Hack-style with a topic token. Their helper library had to be rewritten. The `var` version -- `var name = fetchName(user)` -- never broke.

That is the only horizon story that matters. Stage 2 is permission to *discuss* a problem space in the committee. It is not permission to put the syntax in `printSummary`. If you need left-to-right tonight, name the intermediates. If you need dispose tonight, `try..finally`. If you need value-keys tonight, canonicalize a string or intern an object.

`using` is the horizon feature I *want* you to migrate to when your baseline has it, because `finally` is the block people skip when they add an early `return`. Until then, write the `finally`. Don't write a fake `using` macro.

```js
function withRoster(path,fn) {
    var handle = openRoster(path);
    try {
        return fn(handle);
    }
    finally {
        handle[Symbol.dispose]();
    }
}
```

That's the protocol without the keyword. When `using` lands in your engines, the `finally` is what it writes. You will not have been wrong.

### Decorators Are A Compiler Tax

If Angular's compiler requires `@Component`, that is a framework dialect that *emits* JS. The stage-3 JS decorator, if your engine has it, is a different dialect that shares `@`. Mixing `experimentalDecorators: true` with standard decorators is how you get a field initializer that runs twice or never.

Tonight: a wrapping function. `function logged(fn){ return function(...a){ console.log(fn.name); return fn.apply(this,a); }; }` is boring and portable. Boring is the horizon's friend.

### Composites Will Not Be `#{ }`

If Composites ship as interned objects, `===` might work *because of identity of a canonical instance*, not because JS grew value-equality primitives. That is a different language bet than Records. Your `Map` key tonight is still a string you control (`"73"` or `"14:73"`) or an object you intern yourself:

```js
var intern = new Map();

function keyFor(student) {
    var k = student.id;
    if (!intern.has(k)) intern.set(k,{ id: k });
    return intern.get(k);
}
```

Ugly. Portable. Deletable when Composites exist *and* your baseline has them *and* the equality matches this intern table. Until three "and"s, this is the grain.

### Pattern Matching Is Exhaustiveness Theater Until It Ships

TypeScript `never` in a `switch` is a checker proving you listed every `type` tag. JS `switch` is `===` and a default you can forget. The `match()` helper in this chapter is a loud default. That's the userland exhaustiveness you can ship: throw on unknown tags. When the language grows `match`, migrate the helper. Don't wait to throw.

```js
function classroomStatus(tag) {
    return match({ type: tag },{
        open(v) { return "welcome"; },
        closed(v) { return "see you"; }
    }, function unexpected(v){
        throw new Error("unknown status " + v.type);
    });
}
```

Unknown `"archived"` throws. Silent `undefined` is how status bugs ship.

### `using` And The Main Thread

`await using` in an async function is still *this* function pausing, not a second thread. Dispose later is still a job. Don't assume a file is closed before the next line of the *caller* unless the caller awaited you. Same *Sync & Async* lesson, now with a symbol instead of a `finally` you typed.

The horizon will move after this PDF. Your card from Chapter 1 will not. Fill it. Wait on purpose. Userland tonight. That's how Book 6 stays consistent with Books 1--2 without pretending June is a dialect.

If a horizon feature shipped between this text and your engine, congratulations -- treat it as Chapter 2/3 material and move your baseline. If it died, congratulations -- your `match()` helper still works. Either ending is the point of a moving book.

Pipes: named `var`s. Pattern matching: `match()` + throw. Composites: intern or stringify. Decorators: wrap or pin *one* compiler. `using`: `try..finally` until the keyword is in your baseline. That's five tonight answers. The stages will change. The tonight answers change slower.

Check tc39/proposals the week you read this. If pipes jumped to 4, this paragraph is the one that aged -- and your `BASELINE.md` is how you notice. That's Book 6 doing its job without a yearly reprint of every method.

The series title is still true. You still don't know JS *yet* -- not because June moved, but because the pillars are deep. This chapter is permission not to memorize the horizon. It's not permission to skip Books 2--5.

Wait on purpose. Userland tonight. Check the repo in June. That's the sticky note. The rest of this chapter was the why.

## Five Tonight Snippets, Not Five Plugins

Pipes -- keep the intermediate name so you can log it:

```js
var tagged = student.tags ?? [];
var grouped = Object.groupBy(tagged, function(t){
    return t.track;
});
```

Pattern matching -- a function you control, with a throw:

```js
function matchStatus(tag) {
    if (tag == "open") return "welcome";
    if (tag == "closed") return "see you";
    throw new Error("unknown status " + tag);
}
```

Composites / Records -- intern or stringify for Map keys:

```js
var key = student.id + ":" + student.term;
roster.set(key, student);
```

Decorators -- wrap the function, pin *one* compiler if you must, don't collect plugins:

```js
function logged(fn) {
    return function wrapped(){
        console.log("call", fn.name);
        return fn.apply(this, arguments);
    };
}
```

`using` -- `try..finally` until the keyword is in the baseline:

```js
function withConn(open, fn) {
    var conn = open();
    try {
        return fn(conn);
    }
    finally {
        conn.close();
    }
}
```

Those five are not "worse than the proposal." They *are* JS tonight. When a proposal ships, you delete the helper *if* the proposal's semantics match. If they don't (pipes changed shape twice), you are glad you didn't transpile.

Go write some code. Then come back and re-read the chapter that felt too easy. It won't feel easy the second time. That's the grain.
