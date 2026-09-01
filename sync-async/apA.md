# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Appendix A: Exploring Further

A few topics that didn't need a full chapter, but will bite you in production.

## Thenable Assimilation And Thenable Worms

`Promise.resolve(x)` and the `await` / `.then` flattening algorithm will call `x.then` if it looks callable. A JSON payload like `{ "then": ... }` isn't usually a function. A class instance with a method named `then` *is*. If you `await` one, you don't get the object -- you get a promise adoption.

Name that method something else on DTOs. When bridging foreign futures, wrap once at the boundary (`Promise.resolve(foreign).then(...)`) and speak promises internally.

## Unhandled Rejections

Browsers fire `unhandledrejection`. Node historically crashed (or warned) depending on version and flags. Neither is a logging strategy. Always attach a `.catch` at the top of a fire-and-forget chain, or `await` in an `async` entry that itself is caught.

A rejected promise you later `.catch` may still have been reported as unhandled if a tick passed in between. Settle handlers in the same turn you create the rejection, or use combinators that keep the chain connected.

## `async` Stack Traces

Engines have gotten better at stitching async stacks. They're still worse than a sync throw. Prefer `Error` with useful messages at the *cause* (`{ cause: err }` in `new Error("load failed", { cause: err })`) so logs retain the chain even when the stack doesn't.

## Testing Time

Real `setTimeout` makes slow, flaky tests. Fake timers (in test libraries) turn later into now. They also lie if your code mixes promises (microtasks) and timers (tasks): you must flush both, in the right order. If a test "works" only with a 10ms `sleep`, you don't have a test. You have a race you got lucky at.

## Observables

Some UI frameworks use Observables (push streams with subscribe/unsubscribe). They are not in JS itself. They occupy the same design space as events + async iterators. If you use them, treat subscription disposal as mandatory as `AbortController.abort()`, and don't wrap every promise in an Observable just to have one abstraction -- one-shot values want promises.

## `queueMicrotask` vs `Promise.resolve().then`

They're the same queue for practical purposes. `queueMicrotask(fn)` states intent ("schedule a job") without implying you're doing promise work. If `fn` throws, both typically surface as an uncaught exception / unhandled, depending on host. Don't use either as a "yield to I/O" -- they starve rendering and tasks if you chain too many.

## `fetch` Is Still Promises Plus A Host

`fetch` is not in ECMA-262. It's a host API that *returns* a promise. That split matters when people say "JS is slow at HTTP." JS is waiting. The host is talking to the network. Aborting, cookies, CORS, streaming bodies -- those are host rules sitting on the promise/event-loop grain from this book.

When a new host API shows up (`scheduler.postTask`, `navigator.locks`, whatever June brings), ask the Chapter 1 questions: which queue? does it settle once or fire many times? what's the cancellation token? If you can answer those, you don't need a new book for each API.

## `setTimeout` Is Not A Clock

`setTimeout(fn, 1000)` means "put `fn` on the task queue after *at least* 1000ms, when the current turn is done, when nested-timer clamps allow, when the tab isn't background-throttled." It does not mean "run at T+1000." Drift accumulates. `setInterval` drifts *and* can queue overlapping callbacks if a turn is longer than the interval -- another run-to-completion surprise.

If you need a steady beat, measure `performance.now()` (or Temporal `Instant`) at the start of each tick and schedule the *next* delay from the leftover, or use `requestAnimationFrame` for visual frames. Don't build a metronome out of naive `setInterval` and then blame JS because the drummer sped up.

## `fs` And Other Hosts Still Run To Completion

Node's `fs.readFile(path, cb)` is Chapter 2. `fs.promises.readFile` is Chapter 3. `await readFile` is Chapter 5. `JSON.parse` of the result is Chapter 1's card -- sync, maybe huge. The host changed names. The grain did not. Same for `crypto.subtle`, `indexedDB` wrappers, Electron IPC: if it calls you later, it's a callback or a promise; if it returns bytes you then parse *now*, you still have a now problem.

## Thenable Worms, With A Classroom DTO

```js
var student = {
    id: 73,
    name: "Suzy",
    then(resolve) {
        // leftover from a bad serialization, or a class that
        // thought `.then` meant "and then print"
        resolve(this);
    }
};

async function printName(s) {
    var v = await s;
    console.log(v);
}

printName(student);
```

You wanted to log Suzy. You **adopted** a thenable. `await student` called `student.then`. If `then` calls `resolve(this)` you might get lucky. If it never calls `resolve`, `printName` hangs. If JSON.parse revived a field named `"then"` that isn't a function, you're usually safe -- JSON values aren't callable. A class instance is the trap.

Name the method `andThen` or don't put continuation protocol on records. `Promise.resolve(x)` is the same adoption.

## Unhandled Rejection Is A Turn Too Late

```js
var p = Promise.reject(new Error("nope"));

setTimeout(function(){
    p.catch(function(err){
        console.log("caught later", err.message);
    });
}, 0);
```

Hosts may report `p` as unhandled **before** your timeout runs, then report it handled. The catch is real; the report is about a *gap*. Attach `.catch` (or `await` in a function that catches) in the **same turn** you create the rejection, or keep the chain returned to a caller who will.

```js
window.addEventListener("unhandledrejection", function onUnhandled(evt){
    console.error("unhandled", evt.reason);
    // evt.preventDefault() swallows the host report -- don't
    // use that as your only logger
});
```

Logging here is a backstop, not a control-flow channel. Don't `preventDefault` so you can ignore the promise.

## Fake Timers And Two Queues

```js
Promise.resolve().then(function(){
    console.log("job");
});
setTimeout(function(){
    console.log("task");
}, 0);
```

A test harness that only `jest.advanceTimersByTime(0)` may flush the task and miss that the job already ran -- or the reverse, if it only `flushMicrotasks`. Your `printSummary` mixes both. Flush **jobs, then tasks**, matching Chapter 1, or don't fake time.

If the test needs `sleep(10)` to pass, the program has a race. Fix the program (wait on the promise) instead of tuning the sleep.

## `scheduler.postTask` And Priorities

Where it exists, `scheduler.postTask(fn, { priority: "background", signal })` is a **task** with a declared priority, not a microtask. `user-blocking` vs `user-visible` vs `background` is the host's hint. Abort the signal to drop work you no longer need -- cooperative, like everything else in this book.

Don't polyfill it with `setTimeout(0)` and call it a scheduler. The whole point is the priority queue the event loop already has.

## `Promise.try` And Mixed Sync Throws

```js
function fetchStudentMaybeSync(id) {
    if (id == null) throw new Error("missing id");
    return fetchStudent(id);
}

// throws now -- caller cannot .catch unless they try
fetchStudentMaybeSync(null).catch(onFail);

Promise.try(function(){
    return fetchStudentMaybeSync(null);
}).catch(onFail);
```

`Promise.try(fn)` (ES2025) runs `fn` now, fulfills with a return, rejects if it throws *or* if it returns a rejected promise. That's the adapter Chapter 3 wanted instead of `new Promise` around a function you don't control. If your engine lacks it, `Promise.resolve().then(fn)` is *almost* the same except `fn` runs as a job, not now -- Zalgo-adjacent if `fn` had side effects before throwing.

## `requestAnimationFrame` Is Not `setTimeout(16)`

rAF runs before the next paint, once per frame, paused in background tabs (typically). `setTimeout(fn, 16)` is a timer task that *may* align with a frame and will keep firing in the background (until the host throttles). Animation and layout belong on rAF. Polling a server does not.

`await new Promise(requestAnimationFrame)` as a yield (Chapter 6) is "let a frame happen." Don't use it as a 16ms sleep in Node -- there is no paint.

## Multiple Listeners, One `abort`

```js
var controller = new AbortController();
var { signal } = controller;

button.addEventListener("click", onClick, { signal });
window.addEventListener("resize", onResize, { signal });
fetch("/api/roster", { signal });

controller.abort();
```

One signal tears down events *and* fetch. That's the composition Chapter 3's `AbortSignal.any` is for when the user cancel and a timeout are different controllers. Don't invent a `cancelled` boolean per listener if you already have a controller.

## Node `unhandledRejection` vs The Browser

Node's `process.on("unhandledRejection")` historically could crash the process (version-dependent). Browsers fire `unhandledrejection` on `window` and keep going. Same promise grain, different host policy. In a CLI, an unhandled rejection should be loud. In a SPA, it should be logged and not brick the tab -- but it should still be *fixed*, not `preventDefault`'d as architecture.

## `queueMicrotask` In A Worker

Workers have their own event loop (Chapter 6). `queueMicrotask` there drains on *that* loop, not the page's. A worker that only queues jobs can starve its own `message` tasks the same way a page can starve paint. The flood exercise in Appendix B is not browser-only.

`postMessage` from a worker is a task on the other side. Don't assume the parent's microtasks run "in between" your worker's turns -- they don't share a queue.

## `isTrusted` And Synthetic Events

DOM `click` handlers can run because a user clicked (`event.isTrusted`) or because `button.click()` / `dispatchEvent`. That's still a callback later (or now, if dispatch is sync -- `dispatchEvent` runs listeners *now* on the current turn!). Synthetic dispatch is a Zalgo-ish footgun: same handler, now vs later depending on how the event was fired. User clicks are tasks. `el.click()` is often sync. Don't write the handler as if time were one thing.

## `await` In `finally` Can Replace The Error

```js
async function printSummary(id) {
    try {
        return await fetchStudent(id);
    }
    finally {
        await analytics.flush();     // if this rejects, it *wins*
    }
}
```

Chapter 5 said it. The appendix version is the production bug: you logged the student failure, then `flush` threw a network error, and the caller only saw flush. Wrap the `finally` await, or use `error.cause`. Same as `try..finally` `return` swallowing in *Types & Grammar* -- now with a job in between.

## `Promise.all` Does Not Cancel The Losers

```js
await Promise.all([
    fetchStudent(73),
    fetchStudent(99)         // rejects
]);
```

The combinator rejects when 99 fails. 73's fetch **keeps running**. If 73 was a huge download, you still pay. Pass one `AbortSignal` to both and `abort()` in the `catch` if you meant "fail together, stop together." Race-for-timeout is the same lesson with a timer. Combinators compose *promises*, not *work*.

## `async` Stacks And `cause`

```js
async function load() {
    try {
        await fetchStudent(73);
    }
    catch (err) {
        throw new Error("load failed", { cause: err });
    }
}
```

When the stitched async stack is truncated in a log aggregator, `cause` is the chain you still have. Empty `catch { throw err }` doesn't add context. Empty `catch { }` deletes it. Prefer wrapping at the boundary (`printSummary`) not in every helper.

## `for await` Of A Sync Iterable

```js
async function names(ids) {
    for await (let id of ids) {
        console.log(id);
    }
}

names([ 73, 14 ]);
```

`for await` of an array still works -- the spec awaits each next, and a non-thenable value is treated as already fulfilled. You paid microtask delays for a sync list. `for..of` is the grain for arrays. `for await` is for async iterators. Mixing them "to be future proof" is a waterfall of jobs you didn't need.

## `queueMicrotask` Recursion Cap

Engines can throw if you recurse jobs too deep (a host/engine limit, not "JS ran out of stack" in the sync sense). A `then` that always `then`s is still a flood even if each job is tiny. Prefer a task (`setTimeout(0)`, `scheduler.postTask`, rAF) when the work is "keep going but let the world in." That's Chapter 6's yield, previewed here so Appendix B's flood isn't a toy.

## `MessageChannel` As A Task

`postMessage` to a `MessageChannel` port (even in the same window) queues a *task*, not a job. Libraries use it to yield harder than `queueMicrotask` without waiting a timer. It's still not preemption. It's you putting the card on a different stack (Chapter 1's later). Don't use it to "fix" a 200ms JSON parse -- that's a worker (Chapter 6).

## `node:fs` Parse Is Still Now

`await readFile` is later. `JSON.parse(raw)` is now. Repeat it until a 50MB roster in an HTTP handler makes you angry. Stream or worker. Appendix A of this book is allowed to nag; Chapter 6 already did.

## `AbortSignal.timeout`

`AbortSignal.timeout(ms)` is a signal that aborts later. Combine with user cancel via `AbortSignal.any`. That's still not `Promise.race` cancelling the fetch by itself -- you must *pass* the signal into `fetch`. The appendix repeats it because production keeps racing without aborting.

That's thenables, unhandled rejection, timers vs jobs, abort, rAF, Node vs browser, workers' loops, synthetic events, `Promise.try`, `all` vs cancel, `for await` of arrays, microtask floods, MessageChannel, and fs parse. If a production bug isn't in that list, it's probably still "later is a different world."

Now vs later, jobs vs tasks, once vs many, abort the *work*. Four questions. That's Appendix A. Chapter 6 is when the card is too big for one thread.

## Walk `fetchStudent` One More Time

```js
function fetchStudent(studentID,cb) {
    setTimeout(function(){
        cb({ id: studentID, name: "Suzy" });
    }, 100);
}

function printSummary(studentID) {
    console.log("start", studentID);
    fetchStudent(studentID, function onStudent(student){
        console.log("got", student.name);
    });
    console.log("end", studentID);
}

console.log("before");
printSummary(73);
console.log("after");
```

Predict: `before`, `start 73`, `end 73`, `after`, then later `got Suzy`. `start` / `end` / `before` / `after` are **one task**. The timeout callback is a **later task**. The named `onStudent` is the later card -- Chapter 2's grain. If you wrap this in a promise and `.then` inside `fetchStudent` *and* call `cb` now on a cache hit, you've built Zalgo: same function, two worlds. Appendix B's exercise is "even cache hits settle on a job." That's this walk wearing a cache.

`Promise.all` does not cancel the other fetches when one rejects. `AbortSignal` on `fetch` does. `for await` of an array still awaits each next -- a waterfall of jobs for a sync list. `queueMicrotask` recursion can starve tasks. `JSON.parse` of a 50MB roster is *now* even after `await readFile`. Six leftovers. The walk above is the one that makes the other five obvious: later is a different world.

That's the exploring. The practicing is Appendix B.

`printSummary(73); printSummary(14);` in one turn arms two later cards. They are not ordered by whose `setTimeout` line you typed first -- the host owes you "at least 100ms," not Suzy-before-Kyle. Chapter 1's first lie people tell themselves is that source order of *scheduling* is source order of *later*. The walk above is that lie wearing names. If you still want Suzy first, you needed one chain (`fetchStudent(73).then(() => fetchStudent(14))`) or a join you *meant* (`Promise.all`). That's Chapters 3 and 5. This appendix only needed you to stop collapsing the two worlds.

```js
fetchStudent(73, function onSuzy(student){
    console.log("got", student.name);
    fetchStudent(14, function onKyle(student){
        console.log("got", student.name);
    });
});
```

That's a waterfall you *meant*: Suzy then Kyle. `Promise.all([ fetchStudent(73), fetchStudent(14) ])` is a join you *meant*: both later, names in id order. Two `printSummary`s in one turn is neither -- two independent later cards. Name which program you wrote. That's Appendix A in three snippets.

WARNING:
`Promise.all` rejecting does not abort the other fetches. Pass an `AbortSignal` into the *work*. Combinators join cards; they do not unschedules them. Chapter 3 said it. This appendix repeats it because production keeps racing without aborting.

```js
controller.abort();
// fetch that received controller.signal should reject
// Promise.all does not do this for you
```

Abort the *work*. Join the *cards*. Two verbs. That's the last leftover next to Zalgo, floods, and `for await` of arrays.

`JSON.parse` after `await readFile` is still *now*. A 50MB roster in an HTTP handler is Chapter 6, not a prettier `await`. Two worlds. The exploring is done when that sentence is boring.
