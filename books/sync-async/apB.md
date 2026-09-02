# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Appendix B: Practice

This appendix aims to give you some challenging exercises to test and solidify your understanding of the main topics from this book. Try them in an actual editor instead of skipping straight to the solutions. No cheating!

These exercises don't have a single sacred answer. Your approach may differ from the solutions presented, and that's OK. If you're happy with your code and it honors now-vs-later, I am too.

## Predicting The Loop

Without running it, write down the log order. Then run it. If you missed, re-read Chapter 1 until you can explain *why* each line is now, soon, or later.

```js
console.log("A");

setTimeout(function(){
    console.log("B");
    Promise.resolve().then(function(){
        console.log("C");
    });
}, 0);

Promise.resolve()
    .then(function(){
        console.log("D");
        setTimeout(function(){
            console.log("E");
        }, 0);
        return Promise.resolve();
    })
    .then(function(){
        console.log("F");
    });

console.log("G");
```

## `fetchStudent` Without Zalgo

Implement `fetchStudent(studentID)` so that:

* It returns a **promise** (not a callback API).
* The first call for an ID simulates a 30ms network lookup and fulfills with `{ id, name }` from the table below.
* Later calls for the **same** ID fulfill with the cached record.
* Callers must never observe a now-vs-later flip: even cache hits settle on a **microtask**, not synchronously inside `fetchStudent`.
* A missing ID rejects with an `Error`.
* Two overlapping in-flight calls for the same missing-from-cache ID should share **one** timer (one network), not start two.

```js
var records = {
    14: "Kyle",
    73: "Suzy",
    112: "Frank",
    6: "Sarah"
};

function fetchStudent(studentID) {
    // ..TODO..
}

var p1 = fetchStudent(73);
var p2 = fetchStudent(73);

console.log("after calls");

p1.then(function(s){ console.log("p1", s.name); });
p2.then(function(s){ console.log("p2", s.name); });

fetchStudent(99).catch(function(err){
    console.log("missing", err.message);
});
```

Expected (timing may vary, **order of "after calls" vs "p1" must not**):

```
after calls
p1 Suzy
p2 Suzy
missing ..
```

`after calls` must print *before* `p1` / `p2`, including on the second `fetchStudent(73)` once the cache is warm. Prove it with a second pair of calls in a `setTimeout`.

## Classroom Loader

Write `loadClassroom(ids)` as an `async` function that:

* Fetches every id with your `fetchStudent` (or a stub).
* Runs the fetches **concurrently**, not as a serial `await` in a `for` loop.
* Returns an array of names in the **same order as `ids`**, even if Suzy's network is slower than Kyle's.
* If any id is missing, the returned promise rejects (don't swallow).
* Accepts an `AbortSignal` and passes it through -- if you stub `fetchStudent`, at least check `signal.throwIfAborted()` before returning.

```js
async function loadClassroom(ids,signal) {
    // ..TODO..
}

loadClassroom([ 14, 73, 6 ]).then(function(names){
    console.log(names);
    // [ "Kyle", "Suzy", "Sarah" ]
});
```

BONUS: write a serial `loadClassroomSerial(ids)` and log timestamps to *feel* the waterfall vs the join.

## Two Summaries, One Turn

Predict the log order, then run it. `fetchStudent` from Chapter 1 (100ms timeout, callback style) plus `printSummary` that only logs `student.name`. No cheating with `async` yet -- this is Chapter 1 + 2.

```js
function printSummary(studentID) {
    console.log("start", studentID);
    fetchStudent(studentID, function onStudent(student){
        console.log("got", student.name);
    });
    console.log("end", studentID);
}

console.log("before");
printSummary(73);
printSummary(14);
console.log("after");
```

Write down: which lines are the same task, which are later, and whether Suzy is *guaranteed* before Kyle.

## Microtask Flood

Write a `flood()` that schedules itself forever via `Promise.then` (or `queueMicrotask`). Then schedule `setTimeout(..., 0)` that logs `"task"`. Predict whether `"task"` prints. Then change the flood to `setTimeout(flood, 0)` and predict again.

## `Promise.all` Order

`loadClassroom([ 73, 14 ])` must return names in **id-list order**, even if Kyle's fake network is faster. Write a two-line explanation of why `Promise.all` already does that, and what `Promise.race` would do instead.

## Abort The Loader

Sketch `loadClassroom(ids, signal)` aborting in-flight work when `signal` aborts. You may stub `fetchStudent` as `Promise` + `setTimeout`. The returned promise should reject with the abort reason, not hang.

Once you have answers, *compare* to "Suggested Solutions" at the end of this appendix.

## Suggested Solutions

Keep in mind that these suggested solutions are just that: suggestions. There are many different ways to solve these practice exercises. Compare your approach to what you see here, and consider the pros and cons of each.

Suggested solution for "Predicting The Loop":

```
A
G
D
F
B
C
E
```

Why:

* `A` then `G` are the current task.
* Promise jobs drain: `D`, then the chained job `F`. The `setTimeout` inside `D`'s handler queues task `E` for *later*.
* Next task is the original `setTimeout`: `B`, then its microtask `C`.
* Then task `E`.

If you put `C` before `B`, you treated the timeout callback as a job. If you put `E` before `B`, you treated "I scheduled a timer inside a job" as sooner than an already-queued task. Tasks don't jump the queue just because a job asked for them.

----

Suggested solution for "`fetchStudent` Without Zalgo":

```js
var records = {
    14: "Kyle",
    73: "Suzy",
    112: "Frank",
    6: "Sarah"
};

var cache = {};
var inflight = {};

function fetchStudent(studentID) {
    if (cache[studentID]) {
        return Promise.resolve(cache[studentID]);
    }
    if (inflight[studentID]) {
        return inflight[studentID];
    }
    if (!Object.hasOwn(records,studentID)) {
        return Promise.reject(
            new Error("No student " + studentID)
        );
    }

    inflight[studentID] = new Promise(function executor(resolve){
        setTimeout(function(){
            var student = {
                id: studentID,
                name: records[studentID]
            };
            cache[studentID] = student;
            delete inflight[studentID];
            resolve(student);
        }, 30);
    });

    return inflight[studentID];
}
```

`Promise.resolve(cache[..])` fulfills on a microtask -- that's the no-Zalgo cache hit. `inflight` is the "one network" map: overlapping callers share the same promise until it settles, then `cache` takes over.

----

Suggested solution for "Classroom Loader":

```js
async function loadClassroom(ids,signal) {
    if (signal) {
        signal.throwIfAborted();
    }

    var promises = ids.map(function load(id){
        if (signal) {
            signal.throwIfAborted();
        }
        return fetchStudent(id);
    });

    var students = await Promise.all(promises);
    return students.map(function name(s){
        return s.name;
    });
}

async function loadClassroomSerial(ids) {
    var names = [];
    for (let id of ids) {
        let student = await fetchStudent(id);
        names.push(student.name);
    }
    return names;
}
```

`Promise.all` keeps order of the input iterable, not completion order. That's why you don't need to sort. The serial bonus should look obviously slower in the console once the fake network delay is noticeable.

----

Suggested solution for "Two Summaries, One Turn":

```
before
start 73
end 73
start 14
end 14
after
got Suzy
got Kyle
```

(Or Kyle then Suzy -- the two timeouts are independent.)

`before` / both `printSummary`s / `after` are **one task**. Each `start`/`end` pair is *now* relative to that call; `fetchStudent` only scheduled work. `got` lines are **later tasks**. Suzy is not guaranteed first: both timers were armed ~now, and the host owes you "at least 100ms," not ordering between two equal delays. If you wrote Suzy then Kyle as *required*, you still think the source order of calls orders the later cards.

Suggested solution for "Microtask Flood":

Promise-then flood: `"task"` **never** prints (until the tab is killed). Jobs drain to empty; each job queues another job; the timeout is a task waiting for an empty microtask queue.

`setTimeout(flood, 0)` flood: `"task"` **can** print (order with the other timeout depends on who was queued first). Each flood turn *is* a task, so other tasks interleave. That's Chapter 1's two queues. Cooperative yielding has to put the card on a *task* (or rAF), not another job.

Suggested solution for "`Promise.all` Order":

`Promise.all` fulfills with an array whose *indexes match the input iterable*, not completion order. `race` settles with whichever finishes first -- one value, no list. If you sorted by arrival, you wrote a different program.

Suggested solution for "Abort The Loader":

Pass `signal` into each fetch if the stub supports it; `signal.throwIfAborted()` before `Promise.all`; `AbortSignal.any` if you also have a timeout. Chapter 3: combinators don't stop work by themselves.

```js
async function loadClassroom(ids,signal) {
    signal.throwIfAborted();
    var records = await Promise.all(
        ids.map(function(id){
            return fetchStudent(id, signal);
        })
    );
    return records.map(function(s){ return s.name; });
}
```

That's six loop/promise drills plus abort. Same try-then-solutions shape as *Get Started*. If your log order differs because the host reordered equal timers, that's still Chapter 1 -- not a wrong answer, as long as you didn't treat it as *required* order.

Predict, run, then read the solution. If you predicted `C` before `B` in Chapter 1's first drill, you still collapsed jobs and tasks. Stay there. The rest of the book is that distinction wearing nicer clothes.

Do the flood last. If `"task"` never prints, you felt jobs starving tasks. Then go write `Promise.all` in a real loader.

Now go find a real `fetch` in your codebase and ask: is this a waterfall that wanted `Promise.all`? Is this a click handler with no abort on unmount?

If `"after calls"` printed *after* `p1 Suzy` on a warm cache, you still have Zalgo. Stay on that exercise until the log is boringly `after` then `p1` then `p2`. The rest of the appendix is that one invariant wearing nicer clothes.