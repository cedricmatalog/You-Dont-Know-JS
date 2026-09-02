# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Chapter 5: Async / Await

`async` / `await` is the grammar JS settled on for "write async code so it reads like sync code." Underneath: an `async function` always returns a promise; `await` pauses that function (the rest becomes a `.then`) until the awaited thenable settles.

If Chapter 4 clicked, this chapter is mostly syntax, semantics, and the mistakes the sugar makes easy. If Chapter 4 did *not* click, go back. `await` will feel like a pause button. It is a `.then`. Treating it like a pause button is how you freeze a chain of independent work into a waterfall.

`fetchStudent` and `fetchEnrollments` are still Chapter 3's promise helpers. `await` does not redefine them: 73 is still Suzy, 14 is still Kyle.

## `printSummary` At Last Looks Like Sync

```js
async function printSummary(studentID) {
    try {
        var student = await fetchStudent(studentID);
        var courses = await fetchEnrollments(student.id);
        console.log(
            student.name + " is taking " +
            courses.join(", ")
        );
        return student;
    }
    catch (err) {
        console.error(err);
    }
}

printSummary(73);
// still returns a promise -- callers can await it
```

Compare that to Chapter 3's chain with the closed-over `student` variable. Same jobs. Same later. The compiler wrote the `.then`s. `try..catch` works because a rejection at `await` *throws* here, on this line, in this function -- after the later card has been picked up.

Stay skeptical of how pretty it looks. Pretty is how sequential-by-default sneaks in.

## `async` Functions Return Promises

```js
async function answer() {
    return 42;
}

answer();                    // Promise { 42 }
answer().then(console.log);  // 42
```

Whatever you `return` fulfills the promise (thenables are flattened). If you `throw` (or `await` a rejection you don't catch), the promise rejects.

```js
async function fail() {
    throw new Error("nope");
}

fail().catch(console.log);
```

Arrow functions can be async: `async () => 42`. Methods, too: `async load() { .. }`. `async function*` is an async generator (Chapter 4), which returns an async iterator, not a promise for a single value.

Calling an async function **starts it immediately** (up to the first `await`). That's like `new Promise(executor)` running the executor now. The function is not "scheduled." It runs *now* until it hits `await` (or returns).

## `await` Unwraps Thenables

```js
async function loadName(id) {
    var resp = await fetch(`/api/users/${ id }`);
    var user = await resp.json();
    return user.name;
}
```

`await expr`[^Await]:

1. Evaluates `expr`.
2. If it's not a thenable, wraps it as if `Promise.resolve(expr)` -- and still defers at least to a microtask when you `await` a non-thenable in current JS (don't use `await 42` as a scheduling trick you'd depend on across engines/eras; use `queueMicrotask`).
3. Pauses the async function. The rest of the program continues. The current call stack pops. This is a real async boundary.
4. When the thenable fulfills, the function resumes with the fulfillment as the value of the `await` expression.
5. When it rejects, the function resumes by **throwing** that reason at the `await` line -- which you can `try..catch`.

1. Evaluates `expr`.
2. If it's not a thenable, wraps it as if `Promise.resolve(expr)` -- and still defers at least to a microtask when you `await` a non-thenable in current JS (don't use `await 42` as a scheduling trick you'd depend on across engines/eras; use `queueMicrotask`).
3. Pauses the async function. The rest of the program continues. The current call stack pops. This is a real async boundary.
4. When the thenable fulfills, the function resumes with the fulfillment as the value of the `await` expression.
5. When it rejects, the function resumes by **throwing** that reason at the `await` line -- which you can `try..catch`.

That last point restores `try..catch` across async boundaries, the thing Chapter 2 said callbacks broke:

```js
async function loadName(id) {
    try {
        var resp = await fetch(`/api/users/${ id }`);
        if (!resp.ok) throw new Error("not ok");
        var user = await resp.json();
        return user.name;
    }
    catch (err) {
        log(err);
        return "anonymous";
    }
}
```

`try..catch` around `await` catches rejections. It also catches sync throws in the function. One channel.

| NOTE: |
| :--- |
| `await` on a rejected thenable throws *in the async function*, not in the caller. The caller still has a promise. If the caller does not `await` / `.catch` that promise, you have an unhandled rejection -- the same host report as Chapter 3, now wearing `async`. |

### Errors Across `await` Boundaries

The throw is local to the async function. That is the feature and the trap.

```js
async function loadClassroom(ids) {
    var student = await fetchStudent(ids[0]);
    var guest = await fetchStudent(ids[1]);   // if this rejects...
    return [ student, guest ];
}

loadClassroom([ 73, 99 ]);   // returns a rejecting promise
// `student` is already Suzy. The function throws at the second await.
// nothing rolls back Suzy. later already happened.
```

There is no distributed `try` that undoes the first fetch. If both must succeed or neither should be *used*, you still started both worlds. Join with `Promise.all` if you meant "both or neither as a *result*" -- and still abort in-flight work if you meant "both or neither as *operations*."

A bare `await` inside `map` / `forEach` is a new async function per item if you wrote `ids.map(async id => ...)`. Each of those functions has its own `try`. A throw in one does **not** stop the others. It rejects that one promise, which `map` stuffed into an array you might never `Promise.all`. Unhandled, again.

| TIP: |
| :--- |
| `ids.map(async id => await fetchStudent(id))` is an array of promises, not a join. `map` will not `Promise.all` for you. A throw in one item rejects that one promise and leaves the rest running. |

```js
async function labeled(id) {
    try {
        return await fetchStudent(id);
    }
    catch (err) {
        err.cause = { id };
        throw err;
    }
}
```

Attach context (`id`, `url`, `attempt`) at the boundary you still know it. After `await`, the stack the host shows you is the async function plus `cause` if you set it -- not the caller's sync frames from two turns ago. `Error.cause` is how you keep Chapter 2's "name the later card" once the stack has popped.

### `await` In `catch` And `finally`

You can `await` in `catch` and `finally` too. That's how you log to a server after a failure, or close a handle after either outcome:

```js
async function printSummary(studentID) {
    try {
        var student = await fetchStudent(studentID);
        var courses = await fetchEnrollments(student.id);
        console.log(
            student.name + " is taking " +
            courses.join(", ")
        );
    }
    catch (err) {
        await logError(err);     // later, then continue
        throw err;               // rethrow so the caller still sees failure
    }
    finally {
        await analytics.flush(); // runs on success *and* failure
    }
}
```

A rejection from `logError` *replaces* the original `err` if you don't handle it -- same `finally` override rule as *Types & Grammar*, now with jobs in between. If you need both errors, wrap the inner `await` or use `error.cause`.

Don't put `return` in `finally` after an `await` unless you mean to swallow the `try` result.

## Sequential By Default, Concurrent By Choice

This is the most expensive beginner mistake in the feature:

```js
async function total() {
    var a = await fetchA();     // wait...
    var b = await fetchB();     // ...then start B
    return a + b;
}
```

If `fetchB` does not need `a`, you serialized two independent network calls. The fix is to **start both, then await both**:

| WARNING: |
| :--- |
| `await` in a `for` is a waterfall *even if* the fetches are independent. `forEach(async ...)` is the opposite lie: it looks sequential and is concurrent, and it drops the promises. `Promise.all` is the join you meant. |

```js
async function total() {
    var pa = fetchA();          // start now
    var pb = fetchB();          // start now
    return (await pa) + (await pb);
}

// or:
async function total() {
    var [ a, b ] = await Promise.all([ fetchA(), fetchB() ]);
    return a + b;
}
```

`Promise.all` is better when you want first-rejection semantics and an array of results. Firing the promises first, then awaiting, is the same concurrency if you remember to start them before awaiting.

`await` in a `for` loop is sequential -- that's how you page through an API. `await` in `forEach` is almost always a bug: `forEach` does not wait for async callbacks.

```js
// wrong -- does not wait
items.forEach(async function(item){
    await save(item);
});

// sequential
for (let item of items) {
    await save(item);
}

// concurrent (watch overload / AbortController)
await Promise.all(items.map(item => save(item)));
```

`map` + `Promise.all` is "do all of these, then continue." `for..of` + `await` is "do the next only after the previous."

### See The `forEach` Bug

I said `forEach` does not wait. Watch it, because "does not wait" is easy to nod at.

```js
var ids = [ 73, 14 ];

console.log("before");

ids.forEach(async function load(id){
    var student = await fetchStudent(id);
    console.log("got", student.name);
});

console.log("after");
```

```
before
after
got Suzy
got Kyle
```

`forEach` calls `load(73)` *now*, which runs until `await fetchStudent(73)`, returns a promise `forEach` **ignores**, then calls `load(14)` *now* -- so you accidentally got concurrency! Then `forEach` returns. `"after"` prints. Later, both logs. You did not sequence. You did not `Promise.all`. You started two async functions and dropped both promises on the floor. If `fetchStudent(14)` rejects, that rejection is unhandled unless you `try` inside `load`.

The sequential `for` *does* wait:

```js
console.log("before");

for (let id of ids) {
    let student = await fetchStudent(id);
    console.log("got", student.name);
}

console.log("after");
```

```
before
got Suzy
got Kyle
after
```

`"after"` is after both, because this code lives in an `async` function and each `await` pauses *that* function. Sequential. Pick it when you mean it.

The concurrent join is still `Promise.all(ids.map(fetchStudent))` -- start all, wait all, get order of `ids` not completion order. Three tools, three outcomes. `forEach` + `async` is none of them.

## `await` Is Not Allowed Everywhere

`await` is a keyword in async functions and (as of modules) at the top level of a module (*top-level await*). It is a syntax error in ordinary functions, in non-async callbacks you pass to `map` / event handlers, and in the parameter list. Top-level `await` is still a job -- more on that after cancellation.

## Microtasks And "It Still Interleaves"

```js
async function example() {
    console.log("1");
    await null;
    console.log("3");
}

console.log("0");
example();
console.log("2");
```

```
0
1
2
3
```

`1` is now (sync part of `example`). `await` schedules the rest. `2` is the rest of the current turn. `3` is later (microtask). Async functions do not block the caller. The caller gets a promise *now* and keeps going.

Let's put the student loader in that timeline:

```js
async function printSummary(studentID) {
    console.log("start", studentID);
    var student = await fetchStudent(studentID);
    console.log("got", student.name);
    return student;
}

console.log("before");
var p = printSummary(73);
console.log("after", p);     // Promise { <pending> }
p.then(function(){
    console.log("then");
});
```

```
before
start 73
after Promise { <pending> }
got Suzy
then
```

`start 73` is *now* -- we entered the async function on this turn. `after` is still this turn. `got Suzy` is later (after the fake network). `then` is a job after `printSummary`'s promise fulfills. If you expected `got Suzy` before `after`, you still think `await` blocks the *caller*. It only blocks the *async function*.

Two `printSummary`s on the same turn make the interleaving obvious:

```js
console.log("before");
printSummary(73);
printSummary(14);
console.log("after");
```

Both run *now* until their first `await`. Both fetches are in flight (concurrency). `"after"` prints. Then jobs resume in whatever order the fake timeouts finish. The two functions do not merge into one stack. They are two later worlds that happen to have been started on the same card.

This is why you can deadlock yourself with a busy-loop "waiting" for a flag an async function will set -- that flag will never flip until you finish the current turn. There is no `Thread.Sleep` that pumps the event loop. `await` is how *this* function yields; it is not how you yield for someone else unless they were already scheduled.

## `async` Methods And `this`

```js
var classroom = {
    ids: [ 73, 14 ],
    async printAll() {
        for (let id of this.ids) {
            let student = await fetchStudent(id);
            console.log(student.name);
        }
    }
};

classroom.printAll();
```

`this` is still the Chapter 4 (*Objects & Classes*) `this`: decided by the call site. `classroom.printAll()` binds `this` to `classroom`. Pass `printAll` as a callback and you lose it, same as any other method -- unless you `bind`, use an arrow, or wrap.

```js
button.addEventListener("click", classroom.printAll);
// `this` is the button, `this.ids` explodes

button.addEventListener("click", function onClick(){
    classroom.printAll();
});
```

`async` did not change `this`. It only changed *when* the body finishes. An async method returns a promise the click handler usually ignores -- so put `.catch` on it or `void` a helper that logs. Unhandled rejection in a click handler is a classic production leak.

## Don't `async` Everything

An `async` function that never `await`s is a promise wrapper around sync code. Sometimes that's a stable API ("this might I/O later"). Sometimes it's cargo cult. Costs:

* always a microtask delay for callers who `await` you
* stack traces that hop through promise jobs
* implying I/O when there is none

If the function is sync today and forever, don't mark it `async` just so you can `return` a value. If it might throw and callers already `await` a family of functions, `async` (or `Promise.try`) is a reasonable adapter.

`void someAsync()` / `someAsync()` without `await` or `.catch` is a fire-and-forget that drops rejections. Either handle the promise or make the drop explicit with a named helper that logs.

## Cancellation At The `await`

`await fetchStudent(73, signal)` does not invent a new cancel story. The signal still has to reach `fetch`. What `await` adds is a throw site: abort rejects, `await` throws, `try` around the `await` can distinguish `AbortError` from "Suzy wasn't found."

```js
async function printSummary(studentID, signal) {
    try {
        var student = await fetchStudent(studentID, signal);
        var courses = await fetchEnrollments(student.id, signal);
        console.log(student.name + " is taking " + courses.join(", "));
        return student;
    }
    catch (err) {
        if (err.name == "AbortError") return;
        throw err;
    }
}
```

Swallowing `AbortError` is how an unmounted page stays quiet. Rethrowing everything else is how you don't turn cancel into "all errors are fine." One `AbortController` for the page (or the route), passed down. A new controller per `await` is how you cancel the enrollments call and leave the student call running -- two worlds, two signals, usually a bug.

`for await` of a paginated fetch should abort in `.return()` when the consumer `break`s. Chapter 4 said that. Here it is again because `async`/`await` made people forget the iterator is still a pull protocol with cleanup.

If you `Promise.all` inside `try`, the first reject throws and the other fetches keep going unless they share the signal. Same combinator rule as Chapter 3, now wearing `await`.

## Top-Level `await` Is Still A Job

A module can `await` at the top level. The module graph *waits* for that promise before evaluating importers. It is not a way to sneak sync I/O into load. It is a job, then the rest of the module, then the importer's evaluation -- still later, still one thread.

```js
// classroom.mjs
var students = await Promise.all(ids.map(fetchStudent));
export { students };
```

`import { students } from "./classroom.mjs"` does not run until `students` is fulfilled. A rejected TLA rejects the module. There is no `try` around the whole file unless you write one. Don't TLA a `fetch` you could start from `main` after the graph is up -- you just made every importer wait on the network.

TLA is useful for: config that must exist before any export is used, a WASM instantiate, a polyfill `import()` you already feature-detected. It is not useful for `printSummary`. That still belongs in a function a click can call, and abort.

## What The Compiler Wrote

`await expr` is not a pause button inside the engine. The spec's `Await` operation[^Await] takes the value, if it is not a thenable fulfills a promise with it, then performs `PerformPromiseThen` with continuations for resume-on-fulfill and throw-on-reject. Those continuations run as jobs. The lines after `await` are the `onFulfilled` you didn't write.

```js
async function printSummary(id) {
    var student = await fetchStudent(id);
    console.log(student.name);
}
```

is the same jobs as:

```js
function printSummary(id) {
    return fetchStudent(id).then(function onStudent(student){
        console.log(student.name);
        return student;
    });
}
```

plus: `printSummary` always returns a promise; a throw inside `onStudent` rejects that promise; `try` around the `await` is `.catch` on that job, not a sync `try` around `fetchStudent(id)` the call. Chapter 3's chain is still the machine. The compiler wrote the `.then`s so you would stop closing over `student` by hand.

If that pair of listings does not look equivalent, stay here until it does. Chapter 6 will not make `await` more magic. It will put the same jobs on another heap.

## `await` Using And Resources

As hosts grow `await using` (explicit resource management) for things that must be disposed -- file handles, locks -- acquisition is `await`, and release is deterministic at block exit, including on throw. If your environment has `await using`, use it instead of `try..finally` you forget to write. If it doesn't, `try..finally` is still the grammar from *Types & Grammar* Chapter 5.

## The Shape Of A Program

A mature JS program tends to look like:

* a thin `async` entry (event handler, worker `onmessage`, module TLA, CLI `main`)
* `await` at the orchestration layer
* `Promise.all` / `AbortController` at the concurrency layer
* sync functions for the actual work, so they stay testable without a fake clock

If every function in the stack is `async`, you don't have an architecture. You have a delay. Push `async` to the edges; keep the middle boring.

Let's make sequential-vs-concurrent painful once, with the classroom:

```js
async function loadAllSerial(ids) {
    var result = [];
    for (let id of ids) {
        result.push(await fetchStudent(id));
    }
    return result;
}

async function loadAllTogether(ids) {
    return Promise.all(ids.map(function load(id){
        return fetchStudent(id);
    }));
}
```

`loadAllSerial` waits for Kyle before it even *starts* Suzy. `loadAllTogether` starts everyone, then joins. If each fetch is 50ms and you have 20 IDs, that's ~1000ms vs ~50ms. The `async` keyword did not make the serial version "nice." It made a waterfall easy to type.

Use serial when the next call *needs* the previous value (pagination: `url = data.next`). Use `Promise.all` when it doesn't. People fail it because `await` in a `for` looks so like sync that they stop asking the question.

Chapter 6 steps outside one event loop: workers, shared memory, scheduling against the frame budget, and the host APIs that make "later" concrete. You don't need workers for `printSummary`. You need them when the *current card* is too big to hold until paint.

[^Await]: "27.7.5.3 Await ( value )", ECMAScript 2025 Language Specification; https://262.ecma-international.org/16.0/#await ; Accessed September 2026
