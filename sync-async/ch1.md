# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Chapter 1: Now & Later

Your JS program does not run all at once.

That sentence is obvious if you've ever made a network request, waited for a click, or set a timer. It is also the single most important fact about JS's runtime model, and a surprising amount of code is written as if it were not true -- as if the next line of a function is *always* the next thing the engine will do, and as if "the program" were a straight road instead of a collection of chunks scheduled on a queue.

This book is about those chunks: how JS runs what it can *now*, how it defers the rest until *later*, and how we author code that stays honest about the difference.

Take your time with this chapter. The event loop is not trivia you memorize for interviews and then forget. It is why a `console.log(..)` after `setTimeout(.., 0)` still prints first, why a frozen page is not "ignoring" your click, and why `try..catch` around an async call does not catch the error you thought it would. If those sentences feel fuzzy, good. Stay here until they don't.

## About This Book

Welcome to book 5 in the *You Don't Know JS Yet* series! If you already finished *Get Started*, *Scope & Closures*, *Objects & Classes*, and *Types & Grammar*, you're in the right spot. If not, I encourage you to build those four foundations first. This book assumes they mean something precise to you.

*Get Started* laid out JS as three pillars: scope/closures, prototypes/objects, and types/coercion. Books 2--4 of this series built those pillars. Nothing about asynchrony replaces them.

* Closures (*Scope & Closures*) are how a callback still sees its variables when it finally runs.
* `this` (*Objects & Classes*) is how a method still has a context when it's invoked from a timer.
* Promises are *objects* with a thenable protocol (*Objects & Classes* again, plus this book).
* `await` is *grammar* (*Types & Grammar*).

Asynchrony is not a fourth pillar. It's the clock the other three run on.

The first edition of this material lived in *Async & Performance*, which spent as much time on benchmarking and web workers as on promises. This second-edition book is deliberately retitled *Sync & Async*. Performance still matters -- a 200ms JSON parse still janks a page -- but the grain of JS asynchrony is **time and trust**, not flame charts. We'll get to workers and scheduling in Chapter 6. We will not start there.

| NOTE: |
| :--- |
| *Get Started* Chapter 4 said you could defer this book if it felt too intimidating. That's still true. The more JS you've written (and struggled with!), the more you'll come to appreciate what's here. Don't binge. Interleave reading with programs that actually wait on something. |

If you skipped the earlier books anyway: you can still read this one. When I mention closure, `this`, or thenables, I'm assuming those words mean something precise. If they don't yet, bookmark this page and go build the pillars first. You'll be faster overall, I promise.

## Chunks, Not A Straight Road

In *Scope & Closures* we sorted marbles into colored buckets. That metaphor was about *where* a variable lives. Here we need a metaphor about *when* a statement runs.

Imagine your program as a stack of index cards. Each card is a *chunk* of JS: a function body, a callback, the top-level of a script. The engine picks up a card, reads it top to bottom, and **does not put it down until the card is finished**. No other JS card on this thread gets a turn in between.

When the card says, "ask the network for Suzy's record, and here's another card to read when the answer arrives," the engine does **not** wait with that first card in hand. It hands the request to the host (the browser, Node, ..), puts the first card in the done pile, and picks up whatever card is next -- which is usually *not* the "when Suzy arrives" card. That card is in a different stack: the *later* stack.

*Now* is the card in your hand.
*Later* is every card you have promised to read but have not picked up yet.

If you author as if later cards run in the blank space between two lines of the current card, you will be wrong, over and over, in ways that look like "JS is so weird" and are actually "I lied about time."

Let's make that concrete.

## Sync Means Now

Synchronous code is the easy mental model, and it's not wrong -- it's just incomplete. One statement finishes, the next one starts. A function call runs to completion before the caller continues. There is no preemption: JS on a given thread will not pause your function in the middle to run some other JS on that same thread, except at points you *yield* (the end of the current turn, an `await`, a `yield` in a generator).

```js
var favoriteNumber = 41;

favoriteNumber = favoriteNumber + 1;

console.log(favoriteNumber);     // 42
```

Each line *now*. No later. If `favoriteNumber + 1` took a million years, the `console.log(..)` would wait a million years. That's **run-to-completion**, and it's a feature: you do not have to defend local variables against another JS function mutating them "at the same time" on the same thread. Data races between two pieces of JS require you to *give up* the current turn first.

That's also why a slow synchronous loop freezes a page. The engine is not ignoring your click handler. It hasn't *gotten to* the click handler, because the current card -- the current *turn* -- hasn't been put down.

```js
var start = Date.now();

while (Date.now() - start < 5000) {
    // busy-wait five seconds
}

console.log("done spinning");
```

For five seconds, clicks queue up, timers expire, network responses arrive at the host -- and **none of their JS runs**. Run-to-completion is not optional. You cannot "be nice" from inside a tight loop except by *ending the loop* (or yielding with `await` / `queueMicrotask` shenanigans we'll get to -- which still aren't preemption; they're you putting the card down on purpose).

| WARNING: |
| :--- |
| "I'll just spin until the flag becomes true" is a deadlock if the code that sets the flag is a later card. Later cards do not run until you finish the current one. There is no `Thread.Sleep` in JS that pumps the event loop for you. |

## Async Means Later

Asynchronous code is any code whose *completion* is scheduled for a future turn of the event loop:

```js
console.log("now");

setTimeout(function later(){
    console.log("later");
}, 1000);

console.log("also now");
```

```
now
also now
later
```

`setTimeout(..)` does not pause the program for one second. It asks the host environment to schedule `later()` after *at least* 1000 milliseconds, and it returns *immediately*. "Also now" happens before "later" because "later" is, well, later.

The function `later` is a *callback*: "here's a function; run it when the time comes." Callbacks are the original async primitive in JS. Everything fancier -- promises, `async`/`await`, events, streams -- is still, at the bottom, "run this function later."

Let's look at a slightly less toy program. We'll use it across this book: loading a student record, then that student's active enrollment, then printing a summary. Don't skip the logging. The *order* is the lesson.

```js
var students = [
    { id: 14, name: "Kyle" },
    { id: 73, name: "Suzy" },
    { id: 112, name: "Frank" },
    { id: 6, name: "Sarah" }
];

function fetchStudent(studentID,cb) {
    // pretend this hits the network
    setTimeout(function(){
        var student = students.find(function match(s){
            return s.id == studentID;
        });
        cb(student);
    }, 100);
}

console.log("requesting");

fetchStudent(73, function onStudent(student){
    console.log(student.name);
});

console.log("requested");
```

```
requesting
requested
Suzy
```

`fetchStudent(..)` returns *now*, having only scheduled work. `onStudent(..)` is a later card. The name `Suzy` cannot print between "requesting" and "requested" no matter how fast the timeout is -- even `setTimeout(.., 0)`. We'll prove that in a moment.

I named the callback `onStudent` on purpose. Anonymous inline functions are legal. They are also how you lose stack traces and how you hide the *role* of a chunk. Throughout this book, when a function is a later card, I want you to see its name.

### See The Request

Definitions of "later" are cheap. Watching *this* program's cards is the part that sticks -- the same job *Scope & Closures* Chapter 7 did with `lookupStudent`.

```js
console.log("requesting");           // 1

fetchStudent(73, function onStudent(student){
    console.log(student.name);       // 3 -- a different turn
});

console.log("requested");            // 2
```

1. The current card logs `"requesting"`.
2. `fetchStudent(73, onStudent)` runs *now*. Inside it, `setTimeout` asks the host to hold `onStudent` until ~100ms have passed. `fetchStudent` returns `undefined` *now*. It does not return Suzy. It does not wait.
3. The current card logs `"requested"` and finishes. **The card is down.** Clicks can run. Paint can happen. Other timers can fire.
4. *Later*, the host's timer is due. The event loop picks the timeout callback as a **task**. That callback `find`s Suzy and calls `onStudent(student)`. *Now* (a new now!) we log `"Suzy"`.

There is no blank line between `"requested"` and `"Suzy"` where JS is "waiting." JS is **gone** from this function. Other JS may run. `students` may be mutated (*Time Is A Hidden Input*, later in this chapter). If you needed Suzy *before* `"requested"`, you cannot have her. The network (even a fake one) is not on this card.

Change the delay to `0`. Run it again. `"Suzy"` is still last. Zero is not now. Zero is "soonest *task*," and this script's task isn't finished until after `"requested"`. We'll prove the job-vs-task version of that in the next section.

If you still feel like `fetchStudent` "should" pause, you are thinking in threads-with-sleep. JS on this thread does not sleep. It schedules and it leaves.

## The Event Loop

JS engines as we know them (V8, SpiderMonkey, JavaScriptCore, ..) do not themselves wait on timers, sockets, or clicks. They execute JS. The *host* provides I/O and a queue of work. The *event loop* is the host's policy for when the engine is given the next piece of JS to run.

A slightly simplified picture:

1. JS runs a chunk (a *task* / *macrotask* / *turn*) to completion.
2. When that chunk finishes, the host looks at queues of scheduled callbacks.
3. It picks one, and the engine runs that chunk to completion.
4. Repeat until there's nothing left, then wait for the next external event.

That's it. There is no secret third mode where JS "checks for clicks" in the middle of your `while` loop.

There is not one queue, though. There are at least two time-scales that matter:

* **Tasks** (macrotasks): timers, I/O callbacks, UI events, `setImmediate` (Node), `postMessage` / message events. Each task is a turn. After a task, browsers may render.
* **Microtasks** (jobs): promise reactions (`.then` / `.catch` / `.finally` callbacks), `queueMicrotask(..)`, `MutationObserver` callbacks in the browser. After *every* task, the engine drains the **microtask queue to empty** before rendering or starting the next task.

```js
console.log("A");

setTimeout(function onTimeout(){
    console.log("B");
}, 0);

Promise.resolve().then(function onThen(){
    console.log("C");
});

console.log("D");
```

```
A
D
C
B
```

Walk it with me, slowly.

1. The current task (this script) logs `A`.
2. `setTimeout(.., 0)` asks the host: "please queue `onTimeout` as a **task** once the timer is due." Zero means "as soon as you legally can," not "now."
3. `Promise.resolve().then(onThen)` queues `onThen` as a **microtask**.
4. The current task logs `D` and finishes.
5. Microtasks drain: `C`.
6. The host is allowed to paint, then pick the next task: `B`.

`C` beats `B` even though both were scheduled "now," because "now" is not one bucket. There are *soon* (jobs) and *later* (tasks).

| WARNING: |
| :--- |
| `setTimeout(.., 0)` is not "the next line of code." Nested timers are clamped (historically to 4ms in browsers). The page may be backgrounded. The task queue may be busy. "Zero delay" is "soonest task," not "instant." If you need "after this turn, before rendering," `queueMicrotask(..)` or a promise reaction is the sharper tool -- and even that is not a place to dump unbounded work, because microtasks delay rendering *and* the next task. Starving the microtask queue is how you freeze a page *without* a `while` loop. |

### Jobs Can Queue Jobs

A microtask can schedule another microtask. The queue drains *to empty*, so those nested jobs still run before the next task:

```js
Promise.resolve()
    .then(function first(){
        console.log("first");
        return Promise.resolve();
    })
    .then(function second(){
        console.log("second");
    });

setTimeout(function later(){
    console.log("later");
}, 0);
```

```
first
second
later
```

That chaining is how `async`/`await` (Chapter 5) can look sequential while still being a pile of jobs. It's also how a buggy `.then` that always schedules another `.then` never lets the page paint.

Don't take my word for the order. Paste these snippets. Change them. Log `"now"` and `"later"` until the order bores you. That's the practice this chapter needs.

### Nested Jobs Starve Paint

"Drain to empty" is the phrase that bites people who schedule work with promises because promises feel polite.

```js
function flood() {
    Promise.resolve().then(function again(){
        flood();
    });
}

flood();
setTimeout(function onTimeout(){
    console.log("I may never print");
}, 0);
```

Every job queues another job. The microtask queue never empties. The timeout is a *task*. Tasks wait. Paint waits. The page is as frozen as the five-second `while` loop -- you just didn't write a `while`. You wrote "I'll do this in a promise so I'm not blocking," and then you blocked the only drain the event loop has between turns.

A finite version of the same idea is a `.then` chain that does 10,000 tiny jobs: each is "soon," none is a task, the frame is late. Chapter 6 will say: if the work is big, put the card down with a *task* (or a worker), not with another job.

`queueMicrotask(fn)` and `Promise.resolve().then(fn)` are the same queue for our purposes. Pick one and be honest that you are saying **soon**, not **later**.

## Concurrency Is Not Parallelism

JS in its default mode is **concurrent** and **not parallel**.

*Parallel* means two things are literally executing at the same time (two cores, two threads). *Concurrent* means two things are *in progress* at the same time, even if only one is executing at any instant.

A JS program with three outstanding `fetch()` calls is concurrent: three operations are in flight. On the main thread, only one JS callback runs at a time. The *host* may do the network work in parallel; your JS still serializes at the event loop.

```js
fetchStudent(73, function onSuzy(student){
    console.log("suzy", student.name);
});

fetchStudent(14, function onKyle(student){
    console.log("kyle", student.name);
});

console.log("both requested");
```

```
both requested
suzy Suzy
kyle Kyle
```

(Or Kyle then Suzy -- the two timeouts are independent. That's concurrency: both requests are in flight. It's still one JS thread: the two callbacks will never overlap.)

Web Workers / worker threads *are* parallelism: another JS environment, another event loop, another heap (mostly), communicating by messages (and optionally by shared memory -- Chapter 6). Don't confuse "I fired three fetches" with "I have three threads."

This is why JS can get away without locks for ordinary objects on the main thread. It is also why a 200ms synchronous JSON parse still janks the UI: concurrency of *events* does not preempt *your function*.

If you've come from Java or Go, this is the part that feels like a toy until a production incident teaches you otherwise. JS is not a toy. It is a different coordination model. Author with the model, not against it.

## Time Is A Hidden Input

Every async boundary is a place where the rest of the program can change the world.

```js
var students = [
    { id: 73, name: "Suzy" },
    { id: 14, name: "Kyle" }
];

var currentStudent = students[0];

fetchStudent(73, function onStudent(student){
    // is currentStudent still students[0]?
    console.log(currentStudent.name, student.name);
});

students.shift();
currentStudent = students[0];
```

When `onStudent` runs, `currentStudent` is Kyle, not Suzy. The callback closes over the *binding* `currentStudent` (*Scope & Closures*), whose *value* was reassigned, and over `students`, whose *contents* were mutated. Later code is not later in a vacuum. It's later in a program that kept running.

This is the async cousin of the closure lesson: a function's scope is preserved, but the *values* in that scope are live. Time makes that liveness visible.

Good async code is explicit about:

* **what must still be true** when later runs (and checks it)
* **what is allowed to change** (and doesn't assume it didn't)
* **who owns cancellation** if later shouldn't run at all (`AbortController`, tokens, flags)

```js
var cancelled = false;

fetchStudent(73, function onStudent(student){
    if (cancelled) return;
    console.log(student.name);
});

// user navigated away:
cancelled = true;
```

That's a crude cancellation flag. It's also already more honest than hoping the callback "just won't matter." We'll replace the flag with abort signals as the book goes on. The habit starts now: **later is a different world.** Check your assumptions when you get there.

The `shift` example is not a trick question. It is the default. Between `fetchStudent` returning and `onStudent` running, *your* code ran `students.shift()`. In a real app the "your code" is a click, a router, a second `fetchStudent`, a store update. Closure kept the *variable*. Time changed the *world*. If `onStudent` needed "whoever was current when I requested," it should have closed over a *snapshot*:

```js
var requested = currentStudent;

fetchStudent(73, function onStudent(student){
    console.log(requested.name, student.name);
});
```

`requested` still points at the Suzy object (unless you mutated that object). `currentStudent` the binding does not. This is Chapter 7 of *Scope & Closures* wearing a timer. I will keep connecting those books until it feels like one lesson.

## Now, Then Later

If you remember only one taxonomy from this chapter:

* **Now:** the current turn, run to completion, no other JS on this thread in between.
* **Soon (microtask / job):** promise reactions, `queueMicrotask(..)`. After the current turn, before the next task (and before paint, in browsers).
* **Later (task):** timers, I/O, events. After microtasks, when the host says so.
* **Somewhere else:** workers, other windows, servers. Not your event loop; only messages and shared memory cross the gap.

That's not a lot of categories. People get in trouble by collapsing them into one word, "async," and then being surprised that `Promise.then` beats `setTimeout(0)`, or that `await` in a `forEach` doesn't wait.

The rest of this book is how we *author* the connections between those times without drowning in callbacks, without lying about errors, and without pretending JS is single-threaded *and* frozen until we're done.

Don't rush into Chapter 2 yet. Write a page that logs now/later with a timer, a promise, and a click (if you're in a browser). Predict the order. Then run it. If you predicted wrong, you're in the right book.

Chapter 2 starts with callbacks -- the foundation everything else still sits on, and the failure mode everything else was invented to fix.