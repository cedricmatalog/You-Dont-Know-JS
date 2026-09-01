# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Chapter 6: Concurrent JS

One thread. One event loop. Run to completion. That's the JS you've been writing for five chapters, and it's still the default. This chapter is the rest of the runtime: how the host slices time, how you escape the main thread, and how you share memory when messages aren't enough.

None of this replaces promises. It *surrounds* them.

## Scheduling Against The Frame

In a browser, the user-visible budget is about 16ms per frame if you want 60fps. Long tasks on the main thread miss frames. The event loop will run your JS to completion even if a frame is waiting.

Tools:

* **Don't do the work on the main thread** if you can move it to a worker (next section).
* **`queueMicrotask(..)`** -- soon, before paint. Too much microtask work *delays* paint. Not for big jobs.
* **`setTimeout(fn, 0)` / `setImmediate` (Node)** -- next task(s). Coarse.
* **`requestAnimationFrame(fn)`** -- before the next paint, for visual updates. Do not dump 50ms of JSON parse here; you'll jank the frame you were trying to catch.
* **`scheduler.postTask(fn, { priority })`** (where implemented) -- prioritized tasks (`user-blocking`, `user-visible`, `background`) with `AbortSignal`. This is the grain the platform is moving toward for "run this JS, but be polite."
* **`requestIdleCallback(fn)`** -- leftover time in a frame. Best-effort, not guaranteed. Good for prefetch / analytics, bad for anything the user is waiting on.

```js
async function yieldToPaint() {
    await new Promise(requestAnimationFrame);
}
```

A pattern you'll see in modern UI code is "do a chunk, yield, repeat" so the loop *is* several turns instead of one giant turn. That's cooperative multitasking. You author the yield points. The engine will not insert them for you.

```js
async function highlightNames(names,el) {
    for (let i = 0; i < names.length; i++) {
        el.textContent += names[i] + "\n";
        if (i % 50 == 49) {
            await new Promise(requestAnimationFrame);
        }
    }
}
```

Fifty names, then yield for a frame, then fifty more. Without the `await`, 10,000 names is one card -- and a frozen textarea. With it, you're still on the main thread, still not parallel, but you *put the card down* every so often. That's the Chapter 1 lesson wearing a UI.

How do you know 50 is the right chunk? You don't, until you measure. 50 short strings is nothing. 50 rows of a 2MB JSON parse is everything. The number is not the lesson. The *yield point* is the lesson.

```js
function chunked(items,size,fn) {
    return (async function run(){
        for (let i = 0; i < items.length; i += size) {
            let slice = items.slice(i,i + size);
            slice.forEach(fn);
            await new Promise(requestAnimationFrame);
        }
    })();
}

chunked(students,20,function paint(student){
    list.append(student.name);
});
```

That's still cooperative. The engine will not save you if `fn` itself is 30ms. If `paint` is expensive, the worker is the next tool -- not a smaller `size`.

### See The Frame

`highlightNames` is the whole chapter in miniature. Let's watch it the way Chapter 7 watched `greetStudent`.

```js
async function highlightNames(names,el) {
    for (let i = 0; i < names.length; i++) {
        el.textContent += names[i] + "\n";
        if (i % 50 == 49) {
            await new Promise(requestAnimationFrame);
        }
    }
}
```

Call `highlightNames(classroom, textarea)` from a click handler. *Now:* the `for` starts, fifty names go into `textContent`, `i % 50 == 49` is true, we `await` a rAF promise. The async function **returns a promise to the click handler** and puts the card down. The click turn ends. The host queues a rAF callback. That callback runs *before paint* and **resolves** the promise, which queues the async continuation as a **microtask**. Microtasks run before that same frame's paint, so the next fifty names are written *before the user sees the first fifty*. Cooperative yielding to rAF still interleaves with the frame's microtask checkpoint; it is not "write, paint, write." If you need the paint to land, yield to a **task** (`setTimeout(0)`, `scheduler.postTask`) after the rAF, or chunk less aggressively and measure.

Without the `await`, 10,000 names is one turn. The textarea's value in memory might update; the user sees a frozen tab until the turn ends. The engine will not insert a yield. Cooperative means *you* wrote `await`.

The `50` is not magic. Change it to `1` and you yield too often -- 10,000 frames of overhead. Change it to `10000` and you're back to one card. Measure with the performance panel until a chunk is a few milliseconds, not a theology of fifty.

`queueMicrotask` here would be the wrong yield: microtasks run before paint, so you'd still miss the frame. `setTimeout(0)` yields to the next task, which may be later than the next frame -- fine for background work, sloppy for "I wanted this paint." `requestAnimationFrame` is "I am updating pixels." `scheduler.postTask(..., { priority: "background" })` is "I am not." Pick the queue that matches the *reason* you yielded.

| NOTE: |
| :--- |
| `scheduler.yield()` (where it exists) is "please let the event loop breathe" as a first-class job, with priorities. `await new Promise(requestAnimationFrame)` is the poor-person's version tied to paint. Use the platform primitive when you have it. Don't polyfill it with a busy-loop. |

## Workers: Another Heap, Another Loop

A **Web Worker** (or Node `worker_threads` worker) is another JS world: own global, own event loop, own heap. It does not see your `window`, your DOM, your `currentUser` variable.

Communication is **by message** (structured clone), or by transferring certain objects (ArrayBuffers, MessagePorts) so only one side owns them, or by **SharedArrayBuffer** (later).

```js
// main
worker = new Worker("compute.js", { type: "module" });

worker.postMessage({ cmd: "factor", n: 2n ** 20n });

worker.addEventListener("message", function onMsg(evt){
    console.log(evt.data);
});

// compute.js
self.addEventListener("message", function onMsg(evt){
    var result = factor(evt.data.n);   // heavy, sync, fine here
    self.postMessage(result);
});
```

The main thread stays responsive because `factor` isn't running there. You pay: clone cost, latency, no DOM, debugging two worlds, and the design work of a protocol (`cmd`, correlation IDs for overlapping requests).

**Worklets** (audio, paint, layout -- where they exist) are even more restricted workers for specific rendering pipelines. **Service Workers** are workers that intercept network requests and outlive a tab. Same isolation idea; different lifecycle. Don't use a Service Worker as a compute thread.

`type: "module"` workers can use `import`. Classic workers use `importScripts`. Prefer modules.

### A Protocol, Not A Firehose

Once two `printSummary`s can be in flight, `postMessage` without an id is a race. Name the requests:

```js
// main
var pending = new Map();
var nextID = 1;

function factorOnWorker(n) {
    var id = nextID++;
    return new Promise(function executor(resolve,reject){
        pending.set(id,{ resolve, reject });
        worker.postMessage({ id, cmd: "factor", n });
    });
}

worker.addEventListener("message", function onMsg(evt){
    var job = pending.get(evt.data.id);
    if (!job) return;
    pending.delete(evt.data.id);
    if (evt.data.error) {
        job.reject(evt.data.error);
        return;
    }
    job.resolve(evt.data.result);
});

// compute.js
self.addEventListener("message", function onMsg(evt){
    try {
        var result = factor(evt.data.n);
        self.postMessage({ id: evt.data.id, result });
    }
    catch (err) {
        self.postMessage({
            id: evt.data.id,
            error: { message: err.message }
        });
    }
});
```

Draw that on paper before you write it. The worker should not know about the DOM. The main thread should not know how `factor` works. The *id* is the only shared fiction. Errors have to be cloneable -- a real `Error` object may or may not survive structured clone depending on the engine and fields; sending `{ message }` is boring and reliable.

If you skip the `Map` of pending jobs, the second call's result can fulfill the first call's promise. That's the kind of bug that only shows up under load. Chapter 1 said later is a different world. Two laters at once are two worlds, and they need name tags.

### Dedicated, Shared, Service -- Pick The Lifecycle

**Dedicated workers** are 1:1 with the page (or Node thread) that spawned them. That's the default. When the page dies, they die.

**Shared workers** (browsers, where implemented) can be reached from several tabs of the same origin. Useful for a single websocket fan-in. Also useful for creating mysterious cross-tab bugs. Don't reach for them because "shared" sounds efficient.

**Service workers** intercept `fetch` for a scope, survive the tab, and exist to cache and to be a network proxy. Using one as a compute farm fights their lifecycle (install / activate / waitUntil / skipWaiting). Compute belongs in a dedicated worker you own.

If you are unsure which you have, you wanted dedicated.

### `MessageChannel` Is A Pair Of Ports

`worker.postMessage` is one pipe. `MessageChannel` is two ports that talk to each other -- you can transfer a port *into* a worker so the worker talks back on a private line instead of the broadcast `message` event:

```js
var { port1, port2 } = new MessageChannel();

worker.postMessage({ cmd: "listen" },[ port2 ]);

port1.start();
port1.postMessage({ cmd: "factor", n: 42n, id: 1 });
port1.addEventListener("message", function onMsg(evt){
    console.log(evt.data);
});
```

Same structured clone, same transfer list. The win is isolation: this conversation isn't mixed with every other `message` on the worker. Libraries that wrap workers often hand you a port, not the worker.

## Structured Clone And Transfer

`postMessage(value)` structured-clones `value`. Functions, DOM nodes, and some host objects don't clone. Dates, maps, sets, ArrayBuffers, errors (with caveats), and plain data do.

Transferables move instead of copy:

```js
buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage(buffer, [ buffer ]);
// buffer is detached here; worker owns the memory
```

Use transfer for large binary payloads. Cloning a 50MB buffer on every frame is how you make workers *slower* than main-thread work.

Let's make the JSON trap from the Node section a worker job, because that's the actual fix:

```js
// main
async function parseStudentsJSON(text) {
    var id = nextID++;
    return new Promise(function executor(resolve,reject){
        pending.set(id,{ resolve, reject });
        worker.postMessage({ id, cmd: "parse", text });
    });
}

// compute.js
self.addEventListener("message", function onMsg(evt){
    if (evt.data.cmd == "parse") {
        try {
            var students = JSON.parse(evt.data.text);
            self.postMessage({ id: evt.data.id, result: students });
        }
        catch (err) {
            self.postMessage({
                id: evt.data.id,
                error: { message: err.message }
            });
        }
    }
});
```

The clone of `text` *to* the worker and of `students` *back* is the tax. For a 50MB string, that tax is real -- you may want to transfer an `ArrayBuffer` of bytes and decode in the worker (`TextDecoder`) so the main thread never holds the string and the object graph at once. That's an architecture choice. The *wrong* choice is `JSON.parse` on the main thread in the middle of a click handler "because it's just JSON."

## Shared Memory And Atomics

`SharedArrayBuffer` is a block of memory both sides can see. There is no structured clone; there is a view (`Int32Array`, etc.) onto the same bytes. That's **true parallelism** with **data races** unless you coordinate.

`Atomics` is the coordination:

```js
// both sides have a view onto the same SAB
view = new Int32Array(sharedBuffer);

Atomics.store(view, 0, 1);
Atomics.notify(view, 0, 1);

// other thread:
Atomics.wait(view, 0, 0);     // block until not 0 (workers only -- not the main thread)
```

`Atomics.wait` **blocks the worker**. It is the rare "don't run to completion" primitive, and it is **illegal on the main thread** (it would freeze the page). `Atomics.waitAsync` returns a promise and is safe to use where blocking isn't.

This is systems programming. You can get tearing, stale reads, and heisenbugs. Most application JS should stay in `postMessage`. Reach for SAB when a high-frequency numeric pipeline (audio, wasm, games) has measured that cloning is the bottleneck -- and then prefer living in wasm with a thin JS wrapper.

A mental model that keeps people safe: treat the `SharedArrayBuffer` like a foreign C array. You would not increment a C `int` from two threads without a lock. `Atomics.add(view,0,1)` is that lock-shaped increment. `view[0] += 1` is a data race, even if it "works" in tests.

```js
// wrong -- not atomic
view[0] = view[0] + 1;

// right -- one operation the CPU (and the spec) treat as a unit
Atomics.add(view,0,1);
```

You still need a *protocol* for "I'm done writing the payload in indexes 1..N" -- usually a flag at index 0 plus `notify` / `wait`. That protocol is easy to get almost-right. Almost-right concurrency is the worst kind.

Shared memory also has a **cross-origin isolation** tax in browsers (`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`) because Spectre-class attacks made unrestricted SAB dangerous. If `new SharedArrayBuffer()` throws or is zero, your document isn't isolated.

### See The Race

`view[0] += 1` "works" in a unit test that only has one worker. That's not evidence. Here's a small program that *should* count to 200,000 if increments compose, and won't if they race. Don't run it once and declare victory -- run it until you see a number that isn't 200000.

```js
// main
var sab = new SharedArrayBuffer(4);
var view = new Int32Array(sab);
Atomics.store(view,0,0);

var w1 = new Worker("inc.js",{ type: "module" });
var w2 = new Worker("inc.js",{ type: "module" });

w1.postMessage(sab);
w2.postMessage(sab);

// wait for both "done" messages, then:
Atomics.load(view,0);
```

```js
// inc.js
self.addEventListener("message", function onMsg(evt){
    var view = new Int32Array(evt.data);
    for (let i = 0; i < 100000; i++) {
        // racy:
        view[0] = view[0] + 1;
        // atomic:
        // Atomics.add(view,0,1);
    }
    self.postMessage("done");
});
```

Walk the racy line. Worker 1 reads `0`, worker 2 reads `0`, both write `1`. Two increments became one. That's a lost update. JS did not throw. The event loop did not save you. You asked for shared memory, you got a C bug.

`Atomics.add(view,0,1)` is one RMW (read-modify-write) the CPU treats as a unit. After 200,000 of them, `load` is 200000. That's the whole lesson. Not mutexes, not lock-free queues -- just: **the `+=` you grew up with is not a unit across threads.**

A flag protocol for "payload ready" is the next step, and it's where people get almost-right:

```js
// index 0: 0 = empty, 1 = full
// indexes 1..n: payload

// producer (worker)
writePayload(view);
Atomics.store(view,0,1);
Atomics.notify(view,0,1);

// consumer (other worker)
Atomics.wait(view,0,0);      // sleep while still 0
readPayload(view);
Atomics.store(view,0,0);
```

If you `store` the flag *before* you finish writing the payload, the consumer can `wait` wake, read torn data, and proceed. Order of stores is the protocol. `Atomics` operations have memory-ordering semantics; `view[k] = ...` does not give you those for free.

I am not going to teach you a correct ring buffer in this book. I am going to tell you that if this paragraph felt like the interesting part, you should be in wasm or in a library written by someone who already lost a week to it. Application JS: `postMessage`. Shared memory: measured last resort.

## Node: The Same Loop, Different Host

Node's event loop (libuv) has phases: timers, pending I/O, poll, check (`setImmediate`), close callbacks. Microtasks (promises) still drain between. `process.nextTick` is a Node-specific queue that runs even before other microtasks and can starve I/O if you recurse on it.

```js
process.nextTick(function(){
    console.log("tick");
});
Promise.resolve().then(function(){
    console.log("promise");
});
```

Prefer promises / `setImmediate` / `scheduler` over `nextTick` unless you're writing Node internals. The rest of this book applies: `fs.promises`, `AbortSignal` on many APIs, worker threads analogous to Web Workers, `MessageChannel` for ports.

A Node-shaped `printSummary` is still the same program:

```js
import { readFile } from "node:fs/promises";

async function printSummary(studentID) {
    var raw = await readFile("./students.json","utf8");
    var students = JSON.parse(raw);
    var student = students.find(function match(s){
        return s.id == studentID;
    });
    if (!student) {
        throw new Error("missing student");
    }
    console.log(student.name);
}
```

`readFile` returns a promise. `JSON.parse` is **sync** and will freeze the event loop on a 50MB file -- that's a Chapter 1 card that's too big, not an fs problem. Stream the file, or parse on a worker thread, or both. Don't `await readFile` and then blame Node because `parse` janked your HTTP server. The host gave you later for the disk. You spent now on the CPU.

`process.nextTick` before `Promise.then` is real. Don't write code that depends on that order. Depend on "jobs before the next task," which both satisfy, and leave the micro-queue race to engine tests.

Walk `printSummary` the same way we walked `loadRoster`. `await readFile` puts the card down. libuv fills the buffer *later*, a task runs, the async function resumes as a job, then `JSON.parse(raw)` is **now** -- a completion turn that can be huge. An incoming HTTP request that landed in the poll phase *waits* for that parse. That's not Node being slow. That's you putting a 50MB card on the only JS thread the process has.

```js
import { Worker } from "node:worker_threads";

function parseOnThread(raw) {
    return new Promise(function executor(resolve,reject){
        var w = new Worker(new URL("./parse.js", import.meta.url), {
            workerData: raw
        });
        w.on("message", resolve);
        w.on("error", reject);
        w.on("exit", function onExit(code){
            if (code != 0) {
                reject(new Error("parse worker exit " + code));
            }
        });
    });
}
```

`workerData` structured-clones (or transfers) into the new thread at spawn -- a cousin of `postMessage`. Same tax, same lesson. Don't spawn a thread per HTTP request without a pool; don't parse 50MB on the server's event loop either. Measure. The Node worker is the same other-heap as the Web Worker. The API names changed. The now/later didn't.

`setImmediate` vs `setTimeout(fn, 0)` vs `nextTick` vs `queueMicrotask` is a cottage industry of interview questions. The grain: microtasks (including promises) before the next macrotask; `nextTick` even more eager than promises; `setImmediate` in the check phase. If your program is correct only because of that ordering, it is not correct -- it is lucky. Yield with `await` of a timer or `scheduler.yield()` when you mean "let I/O in." Don't `nextTick` recurse to "defer."

## Cancellation As A System

You've seen `AbortController` with `fetch` and events. Treat it as the *language-level-ish* cancellation bus:

```js
async function load(signal) {
    var resp = await fetch("/api/data", { signal });
    var data = await resp.json();
    signal.throwIfAborted();
    return transform(data);
}

controller = new AbortController();
p = load(controller.signal);
controller.abort();
```

Pass `signal` down. Check it between chunks of CPU work (`signal.throwIfAborted()`). Tie timeouts with `AbortSignal.timeout(ms)` and composition with `AbortSignal.any([ userCancel, timeout ])`.

Promises don't cancel. Operations do. The signal is how you tell the operation.

Workers don't listen to `AbortSignal` by themselves. You *teach* them:

```js
function factorOnWorker(n,signal) {
    var id = nextID++;
    return new Promise(function executor(resolve,reject){
        pending.set(id,{ resolve, reject });
        worker.postMessage({ id, cmd: "factor", n });

        if (signal) {
            signal.addEventListener("abort", function onAbort(){
                worker.postMessage({ id, cmd: "cancel" });
                pending.delete(id);
                reject(signal.reason ?? new Error("aborted"));
            }, { once: true });
        }
    });
}
```

The worker still has to *honor* `cancel` -- cooperative again. There is no preemption. A `factor` that never checks a flag will run to completion even after you aborted the promise. That's the same "later is a different world" lesson as a `fetch` you forgot to pass `signal` to. The promise rejected. The CPU kept going.

If you need to *kill* work, `worker.terminate()` kills the whole worker, in-flight jobs and all. That's a hammer. Recreate the worker after. Fine for "user navigated away." Not fine for "one of twenty factorizations was cancelled."

### Worker Errors Are Another Channel

```js
worker.addEventListener("error", function onError(evt){
    console.error(evt.message, evt.filename, evt.lineno);
});

worker.addEventListener("messageerror", function onBadClone(evt){
    // structured clone failed
});
```

A thrown exception in the worker that you didn't `postMessage` back shows up as `error` on the *main* side -- and may also kill the worker depending on the host. That's two channels again (Chapter 2): the protocol's `{ id, error }` for expected failures, and the event for "the worker actually crashed." Handle both, or you'll debug a pending `Map` that never settles.

`import` failures in a module worker show up here too. `new Worker("missing.js", { type: "module" })` is later. Don't assume the worker exists because the constructor returned.

### A Tiny Pool

One worker is a queue of one CPU. A pool is several workers and a job queue. The shape is boring on purpose:

```js
function makePool(url,size) {
    var idle = [];
    var waiters = [];

    for (let i = 0; i < size; i++) {
        idle.push(new Worker(url,{ type: "module" }));
    }

    function run(msg,transfer) {
        return new Promise(function executor(resolve,reject){
            waiters.push({ msg, transfer, resolve, reject });
            pump();
        });
    }

    function pump() {
        if (idle.length == 0 || waiters.length == 0) return;
        var worker = idle.pop();
        var job = waiters.shift();
        var onMsg = function(evt){
            cleanup();
            job.resolve(evt.data);
        };
        var onErr = function(evt){
            cleanup();
            job.reject(evt);
        };
        function cleanup() {
            worker.removeEventListener("message",onMsg);
            worker.removeEventListener("error",onErr);
            idle.push(worker);
            pump();
        }
        worker.addEventListener("message",onMsg);
        worker.addEventListener("error",onErr);
        worker.postMessage(job.msg,job.transfer || []);
    }

    return { run };
}
```

That's not production-hardened (no per-job ids, no abort, no restart-on-crash). It is the *idea*: workers are a scarce resource, jobs wait, you pump when a worker frees. Libraries exist so you don't maintain this. I want you to see the event loop hiding inside the pool -- `pump` is still one thread on the main side, handing cards to other heaps.

Don't start a pool of 16 on a phone. `navigator.hardwareConcurrency` is a hint, not a promise, and it's often "how many cores" not "how many you should take." Leave one for the UI.

## See The Offload

*Scope & Closures* Chapter 7 didn't just define closure -- it *watched* `lookupStudent` keep `students` alive. We should do the same here. Definitions of workers are cheap. Watching a program move work *and then get the answer back in the right order* is the part that sticks.

Here's a classroom roster as a JSON string -- too big to parse during a click -- and a "score" we pretend is CPU-heavy (factorizing an id, say). Two later worlds: parse, then score. Both must return to the UI without mixing results.

```js
// roster-main.js
var pending = new Map();
var nextID = 1;
var worker = new Worker("roster-worker.js",{ type: "module" });

worker.addEventListener("message", function onMsg(evt){
    var job = pending.get(evt.data.id);
    if (!job) {
        console.warn("late or unknown id", evt.data.id);
        return;
    }
    pending.delete(evt.data.id);
    if (evt.data.error) {
        job.reject(new Error(evt.data.error.message));
        return;
    }
    job.resolve(evt.data.result);
});

function askWorker(cmd,payload) {
    var id = nextID++;
    return new Promise(function executor(resolve,reject){
        pending.set(id,{ resolve, reject });
        worker.postMessage({ id, cmd, payload });
    });
}

async function loadRoster(jsonText) {
    var students = await askWorker("parse",jsonText);
    var scored = await Promise.all(
        students.map(function scoreOne(student){
            return askWorker("score",student.id)
                .then(function attach(score){
                    return {
                        id: student.id,
                        name: student.name,
                        score: score
                    };
                });
        })
    );
    return scored;
}

loadRoster(bigJSON).then(function show(rows){
    rows.forEach(function paint(row){
        console.log(row.name, row.score);
    });
});
```

Walk it. Don't skip.

1. `loadRoster` runs *now* until the first `await`. It calls `askWorker("parse", jsonText)`, which *now* stores `{ resolve, reject }` in `pending` under id `1`, and `postMessage`s. Then `loadRoster` **puts its card down**. The click handler that called it can finish. Paint can happen.
2. The worker's event loop -- a *different* now -- picks up `parse`, `JSON.parse`s, posts `{ id: 1, result: students }`.
3. Main's `onMsg` looks up id `1`, calls `resolve(students)`. That fulfills the promise `loadRoster` was awaiting. `loadRoster` resumes as a **job** (microtask). `students` is a *clone*, not the worker's array.
4. `Promise.all(students.map(..))` starts *N* `score` jobs. Each gets its own id. If you forgot the id, Kyle's score could land on Suzy's row. That's the race this whole section exists to make visceral.
5. Each `score` later comes back, `attach` builds a new object on the *main* heap, `Promise.all` joins, `show` paints.

What did we *not* share? The worker never saw `console.log`. Main never ran `JSON.parse` on the big string (we still cloned it across -- the tax). `student` objects in `attach` are main-thread objects. Mutating them does not mutate anything in the worker. There is no closure across the heap. Closure is a *scope* link (*Scope & Closures*). A worker is a *copy* link. If you catch yourself thinking "the worker closed over `pending`," stop. `pending` lives only on main.

### What If Parse Fails?

```js
// roster-worker.js (sketch)
self.addEventListener("message", function onMsg(evt){
    var id = evt.data.id;
    try {
        if (evt.data.cmd == "parse") {
            var students = JSON.parse(evt.data.payload);
            self.postMessage({ id, result: students });
            return;
        }
        if (evt.data.cmd == "score") {
            self.postMessage({
                id,
                result: factor(evt.data.payload)
            });
            return;
        }
        throw new Error("unknown cmd");
    }
    catch (err) {
        self.postMessage({
            id,
            error: { message: err.message }
        });
    }
});
```

If `JSON.parse` throws, we still `postMessage` with `error` *and the same id*. Main rejects the right waiter. `loadRoster`'s `await askWorker("parse")` throws into whatever `try` you put around it -- Chapter 5. The `score` jobs never start. That's the sequential dependency: parse *feeds* score. `Promise.all` on scores is the concurrent part *after* you have an array.

If you `Promise.all([ askWorker("parse", ..), askWorker("score", 73) ])` you've concurrent-ized two things that aren't independent. Score needs an id from the roster. Concurrent is not "faster"; it's "doesn't need the other result." Chapter 5's waterfall lesson, now with a heap boundary in the middle.

### Late Messages

`if (!job)` in `onMsg` is not decorative. You aborted. You `terminate()`d and spun a new worker whose leftover `message` events you forgot to ignore. You reused ids after `nextID` overflowed (use a bigint or uuid if you are that long-lived). Unknown ids are a *real* state. Logging them is how you find the protocol bug instead of a hang.

Take this roster program and break it on purpose: drop the id, swap parse and score, parse on main. Watch which bug shows up as jank, which as swapped names, which as a pending promise that never settles. That's the practice this chapter needs, more than another API list.

### When Not To Worker

`fetchStudent` from Chapter 1 is I/O. The browser (or Node) already does that off your JS thread. Wrapping `fetch` in a worker buys you a clone of the response body and a protocol you have to debug. It does not make the network faster. It does not make `await resp.json()` free -- it *moves* the parse, which only helps if the parse was the jank.

```js
// this is not an offload
async function fetchStudentOnWorker(id) {
    return askWorker("fetchStudent",id);
}

// roster-worker.js
if (evt.data.cmd == "fetchStudent") {
    var resp = await fetch("/api/students/" + evt.data.payload);
    var student = await resp.json();
    self.postMessage({ id: evt.data.id, result: student });
}
```

Two event loops, two `fetch` stacks, one extra clone of `student` back to main so you can `console.log` it. The click still waits on the network. The main thread was never the bottleneck.

Do this instead: `fetch` on main (or in the existing `printSummary` async function), and only `askWorker("parse", text)` when you've measured that `JSON.parse` of *this* payload misses frames. The worker is for **JS CPU that runs to completion on the main thread**. Network, timers, and most DOM work are already "later" relative to your turn.

Kyle's enrollment print is a handful of fields. Don't worker it. A classroom of 80,000 rows with a naive `JSON.parse` in a `click` handler: worker it, or stream it, or both.

### The Clone Is Still Now

I said the main thread never ran `JSON.parse` on the big string. That's true, and it's incomplete.

`postMessage({ id, cmd: "parse", payload: jsonText })` structured-clones `jsonText` *during the `postMessage` call*. That clone is **now**. A 50MB string copy on the main thread in a click handler *is* a long task. Transferring an `ArrayBuffer` is the way you stop paying "copy now":

```js
function askWorkerParseBytes(bytes) {
    var id = nextID++;
    return new Promise(function executor(resolve,reject){
        pending.set(id,{ resolve, reject });
        worker.postMessage(
            { id, cmd: "parseBytes" },
            [ bytes ]
        );
        // `bytes` is detached here -- you cannot read it on main anymore
    });
}

// roster-worker.js
if (evt.data.cmd == "parseBytes") {
    var text = new TextDecoder().decode(evt.data /* transferred buffer */);
    var students = JSON.parse(text);
    self.postMessage({ id: evt.data.id, result: students });
}
```

I left the worker snippet slightly wrong on purpose -- the transferred buffer isn't `evt.data`, it's whatever you put in the message *and* listed in the transfer array. You have to design the envelope so the bytes *are* the transferable:

```js
worker.postMessage(
    { id, cmd: "parseBytes", bytes: bytes },
    [ bytes ]
);
```

On the worker, `evt.data.bytes` is the buffer. Main's `bytes` is detached. Decode, parse, post the *result* back -- and that result, if it's 80,000 student objects, is a structured clone *to* main. You've moved the parse. You have not made the object graph free.

Sometimes the right design is: worker parses, worker scores, worker posts back a *small* summary (`{ count, top: [...] }`), and main never holds the roster. That's not a worker trick. That's remembering that the clone *is* the interface.

### Two Loops, One User

The user clicked once. From their point of view there is one "load the roster" action. From the runtime's point of view there are two heaps, two event loops, a `Map` of pending ids, N score messages, and a `Promise.all` that joins them.

If `show` paints 80,000 rows in one turn, you've spent the worker's gift. `chunked` from the start of this chapter still applies *after* the worker comes back. Offload and cooperative yielding are not alternatives. They stack.

If the user clicks twice, you have two `loadRoster`s in flight, two overlapping id spaces (they share `nextID` -- good), and two `Promise.all`s. That's fine if each job has an id. That's a swapped-row bug if they don't. Chapter 1 said later is a different world. Two clicks are two laters that share one worker. Name the requests.

If the user navigates away, `terminate` the worker and forget the `pending` `Map` -- those promises should reject, or you'll leak resolvers. `AbortSignal` on `loadRoster` that both `abort`s in-flight `fetch` *and* posts `cancel` / terminates is the same cancellation bus as Chapter 5, now with a second heap that does not read your mind.

## A Closing Model

JS concurrency, in one page:

| Mechanism | Same thread? | Shares heap? | Preempts JS? |
| :--- | :--- | :--- | :--- |
| Function call | yes | yes | no |
| Microtask | yes | yes | only between turns |
| Timer / I/O task | yes | yes | only between turns |
| Worker message | no | no (clone/transfer) | no |
| SharedArrayBuffer | no | yes (that buffer) | only at Atomics.wait in workers |

Stay on the first rows until you can't. When you can't, isolate first (workers + messages). Share memory last.

You now have the clock: now vs later, callbacks vs promises vs `await`, one loop vs many. The last book in the series, *ES.Next & Beyond*, is about the language still moving -- including APIs that will change how some of this chapter is spelled, but not the event-loop facts underneath.

Time is still an input. Author like you know that.

Don't start a worker for `fetchStudent`. Do start one when `factorizeClassroomIds` pegs the CPU for 200ms. Measure first (*the first edition of this book spent whole chapters on that -- the grain is: if you can't feel the jank, you probably don't need a worker yet*). Then draw the message protocol on paper before you write `postMessage`. Correlation IDs for overlapping requests are not optional once two `printSummary`s can be in flight.

Appendix B has exercises. Do them in an editor. Predicting `"A" "D" "C" "B"` on paper is not the same as shipping a waterfall by accident.
