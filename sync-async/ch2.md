# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Chapter 2: Callbacks

A callback is a function you pass to another function so that *it* can call *you* later.

That's the whole idea. It is also, historically, how JS expressed *all* asynchrony: timers, DOM events, XHR, Node's filesystem, `addEventListener`, `arr.map(fn)`. Some of those callbacks are sync (`.map(..)` calls you *now*, once per element). Some are async (the click hasn't happened). The grammar looks the same. The *when* is not.

This chapter is about the async kind, the problems they cause when they're your only tool, and the patterns that make them less of a liability. We are not throwing callbacks away -- promises and `await` still *are* callbacks, dressed up. We are learning why the dress-up was necessary.

If Chapter 1 felt abstract, this one should feel uncomfortably familiar. You've written this code. You may even still be writing it. Stay with the discomfort; it's pointing at the real bugs.

## Sync Callbacks vs Async Callbacks

Not every function you pass to another function is "async." `map` is the classic confusion:

```js
var names = ["Kyle", "Suzy", "Frank"];

console.log("before");

names.map(function upperName(name){
    console.log(name.toUpperCase());
    return name.toUpperCase();
});

console.log("after");
```

```
before
KYLE
SUZY
FRANK
after
```

`upperName` is a callback. It ran *now*, three times, before `after`. That's still run-to-completion of the current card. `map` just happens to call you as part of finishing its own card.

Contrast:

```js
console.log("before");

setTimeout(function later(){
    console.log("later");
}, 0);

console.log("after");
```

```
before
after
later
```

Same "pass a function" grammar. Opposite *when*. If an API does not document whether your callback is now or later -- or worse, *sometimes now and sometimes later* -- you cannot write the rest of the function soundly. We'll name that disease in a moment (Zalgo).

| TIP: |
| :--- |
| When you author an API, pick one: always now, or always later. If the work might already be done, still schedule the callback on a microtask. Callers can write one mental model. |

## Nesting, Or "Callback Hell"

Let's go back to the student program from Chapter 1 and make it do more than one later thing: fetch the student, then fetch that student's enrollments, then print a summary.

```js
function fetchStudent(studentID,cb) {
    setTimeout(function(){
        cb(null,{ id: studentID, name: "Suzy" });
    }, 50);
}

function fetchEnrollments(studentID,cb) {
    setTimeout(function(){
        cb(null,[ "YDKJS", "Functional-Lite" ]);
    }, 50);
}

function printSummary(studentID) {
    fetchStudent(studentID, function onStudent(err,student){
        if (err) {
            console.error(err);
            return;
        }
        fetchEnrollments(student.id, function onEnrollments(err,courses){
            if (err) {
                console.error(err);
                return;
            }
            console.log(
                student.name + " is taking " +
                courses.join(", ")
            );
        });
    });
}

printSummary(73);
// Suzy is taking YDKJS, Functional-Lite
```

The pyramid is the part people screenshot. The pyramid is not the actual problem. Indentation is a formatting complaint. You can "fix" the pyramid by naming functions and un-nesting:

```js
function printSummary(studentID) {
    fetchStudent(studentID,onStudent);

    function onStudent(err,student) {
        if (err) {
            console.error(err);
            return;
        }
        fetchEnrollments(student.id, function onEnrollments(err,courses){
            if (err) {
                console.error(err);
                return;
            }
            console.log(
                student.name + " is taking " +
                courses.join(", ")
            );
        });
    }
}
```

That's flatter. It's still callback hell. The real complaints are:

1. **Order is implied by nesting / by who calls whom**, not declared as data. Reading this requires tracking "what happens after success" through several functions.
2. **Error handling is copy-pasted** at every level. Miss one `if (err) return` and a failure becomes a silent hang -- `printSummary` just never prints.
3. **The still-later work is trapped** inside the innermost function. Reuse, testing, and "just skip `fetchEnrollments` when cached" all fight the nesting.
4. **Inversion of control:** you handed `fetchStudent` the keys to *your* continuation. You hope it calls `onStudent` exactly once, with `(err, value)` in the right shape, on the right tick, and never again. Hope is not an API.

"Callback hell" is an inversion-of-control hell that happens to look like a triangle.

### See The Pyramid

Walk `printSummary(73)` as cards, not as indentation.

1. *Now:* `printSummary` calls `fetchStudent(73, onStudent)` and returns. The function that *looks* like it "prints a summary" has finished without printing. That's not a bug. That's the shape. The name is a lie until later.
2. *Later (task):* the fake network calls `onStudent(null, student)`. If we forget `if (err) return`, a failure still falls into `fetchEnrollments`. If we remember, we `return` and **nothing else in `printSummary` ever runs** -- no log, no recovery, no signal to a caller. `printSummary` returned `undefined` *now*; the caller has no promise to `.catch`. The error is a `console.error` we happened to write. Miss the `console.error` and the failure is silence.
3. *Now (inside that later):* `onStudent` calls `fetchEnrollments(student.id, onEnrollments)` and ends. Another card scheduled. `student` is kept alive by **closure** -- `onEnrollments` will still see it. That's Book 2 doing Book 5's job.
4. *Later still:* `onEnrollments` prints. If *this* `err` is missed, we `join` on `undefined` and throw on a turn whose `try` is long gone.

Three functions, two later boundaries, one printed line. The triangle is how we *wired* the laters. Naming `onStudent` flattened the file and did not add a return value, did not add a second call-once guarantee, did not stop Zalgo inside `fetchStudent`. That's why the next section is about trust, not tabs.

## Inversion Of Control

When you call `fetchStudent(id, cb)`, you are no longer in charge of:

* **whether** `cb` is called
* **how many times**
* **now vs later** (some APIs call the callback synchronously if the value is cached -- that's Zalgo)
* **which arguments**, in which order, on success vs failure
* **which `this`**
* **what happens if `cb` throws**

You inverted control to `fetchStudent`. If `fetchStudent` is *your* function, maybe that's fine. If it's a library, a browser API, or a coworker, you have a trust boundary in the middle of your program's time-line.

Let's make Zalgo visible, because it's the one I still see in production caches:

```js
var cache = {};

function fetchStudent(studentID,cb) {
    if (cache[studentID]) {
        cb(null,cache[studentID]);     // NOW
        return;
    }
    setTimeout(function(){
        cache[studentID] = { id: studentID, name: "Suzy" };
        cb(null,cache[studentID]);     // LATER
    }, 50);
}

function printSummary(studentID) {
    var called = false;

    fetchStudent(studentID, function onStudent(err,student){
        console.log("student callback", called);
        called = true;
    });

    console.log("after fetchStudent", called);
}

printSummary(73);
// after fetchStudent false
// student callback false

setTimeout(function(){
    printSummary(73);
    // student callback false      <-- NOW, cache hit, before after
    // after fetchStudent true
}, 80);
```

The *same function*, two calls, two different orders relative to "after `fetchStudent`." The second call has to happen *after* the cache is warm -- a later turn, not back-to-back on the first turn. Any code you write after the call that assumes `called` is still `false` is a landmine. That's Zalgo: sometimes now, sometimes later, from one API.

The fix on the *author* side of `fetchStudent` is boring and correct: always later.

```js
function fetchStudent(studentID,cb) {
    if (cache[studentID]) {
        queueMicrotask(function(){
            cb(null,cache[studentID]);
        });
        return;
    }
    // .. network, then cb, still later
}
```

Splits that restore trust:

* Call the callback **always asynchronously**, even on cache hit.
* Call it **once**.
* Pick **one error convention** and never mix it. Node's error-first `(err, value)` is a convention, not a law of physics; mixing it with `onError`/`onSuccess` dual callbacks in the same codebase is how you drop errors.
* Document `this`, or don't use `this` in the callback.

Promises (Chapter 3) exist largely to *standardize* those split decisions so you don't renegotiate them with every API.

## Error-First And The Two Channels

Node popularized:

```js
fs.readFile("config.json", function onRead(err,contents){
    if (err) {
        // failure channel
        return;
    }
    // success channel
});
```

One function, two channels, distinguished by the first argument. It's compact. It's also easy to get wrong:

* Forgetting `return` after handling `err` so success code also runs.
* Checking `if (contents)` and missing a valid empty file (`""` is falsy; *Types & Grammar*).
* Throwing inside `onRead` and having nobody to catch it because the stack that called `readFile` is already gone.

That last point is critical. `try..catch` around `fs.readFile(..)` does **not** catch errors thrown inside `onRead`. The throw happens *later*, on a different turn, with a different stack. Uncaught, it becomes an unhandled exception at the host level.

```js
try {
    fetchStudent(73, function onStudent(err,student){
        JSON.parse("{");    // throws later -- NOT caught by this try
    });
}
catch (err) {
    // never sees JSON.parse failures
}
```

Callbacks break `try..catch` across the async boundary. Every async style after this one is, in part, an attempt to put errors back on a channel you can compose.

There's another subtle bug in error-first style: what if the success value is an `Error` object you meant to pass through? You must use `cb(null, errValue)` -- the `null` is doing real work. `cb(errValue)` would look like failure. Conventions this brittle are why we wanted a better container (Chapter 3).

## Once, Always Later

A tiny utility that already improves callback APIs:

```js
function onceLater(fn) {
    var called = false;
    return function wrapped(...args){
        if (called) return;
        called = true;
        queueMicrotask(function(){
            fn.apply(this,args);
        });
    };
}
```

Wrap a continuation with `onceLater` before handing it to a third party and you've bought: at most one call, always on a microtask, never Zalgo. You haven't bought structured errors, composition, or cancellation. That's the next chapters. But if you still have to live in callback APIs -- and you will: events, many DOM APIs, older Node -- this is the grain.

Try it against a hostile fake:

```js
function hostileFetch(cb) {
    cb(null,{ id: 73 });
    cb(null,{ id: 73 });     // oops, twice
    cb("nope");              // and a fake error
}

var safe = onceLater(function onStudent(err,student){
    console.log("called", err, student);
});

hostileFetch(safe);
// called null { id: 73 }
// (only once, and later)
```

That's not paranoia. That's experience.

There's a `this` bug waiting in `onceLater` if you copy it carelessly. The `queueMicrotask` callback is not the same call site as `wrapped`. If `fn` needed `this`, capture it:

```js
function onceLater(fn) {
    var called = false;
    return function wrapped(...args){
        if (called) return;
        called = true;
        var context = this;
        queueMicrotask(function(){
            fn.apply(context,args);
        });
    };
}
```

The first edition of this material spent a lot of time on `this` in callbacks (*Objects & Classes* is the home now). Async doesn't invent a new `this`. It just makes the call site *later*, which is when people notice they lost it.

## Events Are Callbacks With A Name

```js
button.addEventListener("click", function onClick(evt){
    submitForm(evt);
});
```

Event handlers are callbacks that can fire **zero or many** times. That's the correct model for clicks. It's the wrong model for "load this student," which should fire once. Using an EventEmitter for a one-shot I/O result is how you get listeners added too late (missed the event) or never removed (leaks).

Rules of thumb:

* **One-shot result:** callback, promise, or `async` function. Not an event.
* **Stream of things:** events, async iterators, observables-like patterns. Unsubscribe / `AbortController` / `removeEventListener` is part of the API, not an afterthought.

`AbortController` is the modern cancellation grain for both `fetch` and events:

```js
var controller = new AbortController();

button.addEventListener("click", onClick, {
    signal: controller.signal
});

// later, user left the page / component unmounted:
controller.abort();
```

We'll use abort signals again with `fetch` and `Promise.race` in Chapter 3. Notice the habit from Chapter 1: later might be a world you no longer care about. Cancellation is how you say so.

## Thunks

A *thunk* is a function that already has everything it needs to produce a value -- no arguments, just "go." Sync thunks are boring: `function thunk(){ return 42; }`. Async thunks wrap a callback API so the caller doesn't see the inversion as clearly:

```js
function fetchStudentThunk(studentID) {
    return function thunk(cb){
        fetchStudent(studentID,cb);
    };
}

var loadSuzy = fetchStudentThunk(73);

// later, or in several places:
loadSuzy(function onStudent(err,student){
    console.log(student.name);
});
```

`loadSuzy` is a *value that represents work*. You can pass it around, store it, kick it off twice (careful -- unless `fetchStudent` caches). This looks like a historical curiosity. It is the immediate ancestor of promises: a value that you can pass around, and that you "run" later by giving it a continuation. Promises just standardized the shape of that value and the rules for composing it.

If you understand thunks, `.then(fn)` will feel like "the thunk finally got a standard API," not like a brand new universe.

## What Callbacks Are Still For

* **Synchronous iteration:** `map`, `filter`, `sort` comparators. These are not async. Don't `await` inside them and expect it to sequence the loop -- that's Chapter 5.
* **Event streams:** clicks, WebSocket messages, `MutationObserver`.
* **The implementation of every higher abstraction.** `.then(fn)` *is* a callback. `await` *is* a callback (a resume) the compiler writes.

You don't need to fear callbacks. You need to stop using raw callbacks as the *composition* mechanism for one-shot async results. That's what promises are for, and they're up next.

Before you turn the page: take the `printSummary` pyramid and un-nest it with named functions. Then list, on paper, every way `fetchStudent` could violate your trust (never call, call twice, call now, call with the arguments swapped). That list is Chapter 3's job description.