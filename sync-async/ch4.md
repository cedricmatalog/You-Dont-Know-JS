# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Chapter 4: Iterators & Generators

Asynchrony is about *later*. Iteration is about *the next one*. JS connects those ideas with a protocol: an object that can produce a sequence of values, one at a time, on demand. Once you can pause a sequence, you can pause it for a promise. That's the road to `async`/`await`.

This chapter is the protocol and the syntax. Chapter 5 is the sugar. If you skip this chapter, `async function` will remain magic, and magic is how you misuse `await` in `forEach`. Stay here.

We'll keep using students. This time the sequence is *a list of IDs we pull one at a time* -- iteration -- and then we'll pause that sequence for promises.

## The Iterator Protocol

An **iterator** is an object with a `.next()` method that returns `{ value, done }`:

```js
iterator = {
    i: 0,
    next() {
        if (this.i > 2) return { value: undefined, done: true };
        return { value: this.i++, done: false };
    }
};

iterator.next();     // { value: 0, done: false }
iterator.next();     // { value: 1, done: false }
iterator.next();     // { value: 2, done: false }
iterator.next();     // { value: undefined, done: true }
```

An **iterable** is an object that can *produce* an iterator, via `Symbol.iterator`:

```js
countdown = {
    from: 3,
    [Symbol.iterator]() {
        var n = this.from;
        return {
            next() {
                if (n < 1) return { done: true };
                return { value: n--, done: false };
            }
        };
    }
};

for (let n of countdown) {
    console.log(n);
}
// 3 2 1
```

`for..of`, spread (`[...countdown]`), `yield*`, and `Promise.all(..)` (on iterables of promises) all use this protocol. Arrays, strings, maps, sets, and `arguments` are built-in iterables. Plain objects are **not** -- `for..of` on `{ a: 1 }` throws. (`Object.keys` / `Object.entries` give you iterables *of* an object's contents.)

| NOTE: |
| :--- |
| `for..in` is not iteration of values. It walks enumerable string keys, including the `[[Prototype]]` chain. Don't mix `for..in` and `for..of` in your head. *Types & Grammar* and *Objects & Classes* already picked this fight. |

Optional iterator methods: `.return(value)` (the consumer bailed -- `break`, `throw`, `return` inside `for..of`), `.throw(err)` (the consumer wants to inject an error). Generators implement all three.

## Generators: Functions You Can Pause

A generator function is spelled `function*` (star next to `function`). Calling it does **not** run the body. It returns an iterator. Each `.next()` runs the body until the next `yield` (or until `return` / the end).

```js
function* numbers() {
    console.log("start");
    yield 1;
    yield 2;
    console.log("end");
    return 3;
}

it = numbers();

it.next();     // logs "start"; { value: 1, done: false }
it.next();     // { value: 2, done: false }
it.next();     // logs "end";   { value: 3, done: true }
```

`yield` is two-way. The expression `yield x` *sends* `x` out as `.next()`'s `value`. The *result* of the `yield` expression is whatever was passed *in* to the subsequent `.next(inValue)`:

```js
function* addOne() {
    var x = yield "give me a number";
    return x + 1;
}

it = addOne();

it.next();       // { value: "give me a number", done: false }
it.next(41);     // { value: 42, done: true }
```

The first `.next()` argument is unused -- there's no `yield` waiting yet. After that, each `.next(v)` resumes the generator and is the value of the paused `yield`.

Let's walk that twice, slowly, because this is the bit people nod at and then cannot write.

```js
function* interview() {
    var name = yield "What is your name?";
    var course = yield `Hi ${ name }, which course?`;
    return `${ name } enrolled in ${ course }`;
}

var it = interview();

var q1 = it.next();
// q1.value: "What is your name?"
// the generator is paused at the first yield
// `name` is not assigned yet

var q2 = it.next("Suzy");
// "Suzy" becomes the result of `yield "What is your name?"`
// so name = "Suzy"
// q2.value: "Hi Suzy, which course?"

var done = it.next("YDKJS");
// course = "YDKJS"
// done.value: "Suzy enrolled in YDKJS"
// done.done: true
```

The *questions* go out. The *answers* come in on the next `.next(..)`. If you pass the answer on the *first* `.next("Suzy")`, it is thrown away -- there was no `yield` waiting to receive it. I have watched this eat an afternoon in a workshop.

`it.throw(err)` throws inside the generator at the paused `yield`. If you `try..catch` around that `yield`, you can recover. If you don't, the generator dies and `.throw` comes back as a thrown exception to the caller.

```js
function* safe() {
    try {
        yield "go";
    }
    catch (err) {
        yield "recovered";
    }
}

var it = safe();
it.next();              // { value: "go", done: false }
it.throw("boom");       // { value: "recovered", done: false }
it.next();              // { value: undefined, done: true }
```

`it.return(v)` runs `finally` and completes with `v`. `for..of` calls `.return()` if you `break`. That's why a generator that holds a file handle should `try..finally` around its `yield`s -- `break` still cleans up.

`it.throw(err)` throws inside the generator at the `yield`. `it.return(v)` runs `finally` blocks and ends the generator. Both are how `for..of` cleans up on `break`.

### `yield*`

`yield*` delegates to another iterable/generator: every value it produces is yielded, and its completion value becomes the result of the `yield*` expression.

```js
function* inner() {
    yield 2;
    yield 3;
    return "from inner";
}

function* outer() {
    yield 1;
    var result = yield* inner();
    yield result;
}

[...outer()];     // [ 1, 2, 3, "from inner" ]
```

## Generators As State Machines

A generator is a state machine whose states are "the next line after a `yield`." That's often clearer than an object with a `status` enum and a `step()` method.

```js
function* lock() {
    yield "locked";
    yield "unlocking";
    return "open";
}
```

The useful version is when each `yield` is a *question* the outside world answers with `.next(answer)` -- games, protocol parsers, "wizard" UIs. The generator holds the sequence; the caller holds the I/O.

## Pushing Async Through A Generator

Here's the historical punchline, still worth seeing because `async function` is this pattern with a compiler:

```js
function run(gen, ...args) {
    var it = gen(...args);

    return Promise.resolve().then(function handleNext(value){
        var next = it.next(value);
        return (function handleResult(next){
            if (next.done) return next.value;
            return Promise.resolve(next.value).then(
                handleNext,
                function handleErr(err){
                    return Promise.resolve(it.throw(err))
                        .then(handleResult);
                }
            );
        })(next);
    });
}

function* loadUser(id) {
    var resp = yield fetch(`/api/users/${ id }`);
    var user = yield resp.json();
    return user.name;
}

run(loadUser, 42).then(console.log);
```

`yield` a promise, and `run` waits for it, then `.next(fulfillment)` (or `.throw(rejection)`). The generator *looks* synchronous: `var resp = yield fetch(..)`. That's `await`. That's all `await` is.

You don't need to write `run`. You need to know that `async`/`await` did not invent a new runtime primitive. It standardized this runner, with better stack traces, `return`/`throw` semantics, and grammar that forbids some of the generator mistakes (forgetting to yield the promise, yielding the wrong thing).

## Async Iterators

The async cousin of `Symbol.iterator` is `Symbol.asyncIterator`. `.next()` returns a **promise** for `{ value, done }`. Consumption is `for await..of`:

```js
async function consume(stream) {
    for await (let chunk of stream) {
        console.log(chunk);
    }
}
```

Async generator functions (`async function*`) `yield` values (possibly promises, which are awaited before they're delivered) and can `await` inside the body:

```js
async function* pages(url) {
    while (url) {
        let resp = await fetch(url);
        let data = await resp.json();
        yield data.items;
        url = data.next;
    }
}
```

`ReadableStream`, some Node streams (in object mode / web streams), and paginated APIs all fit this grain: a sequence whose *next* is inherently later.

If you only have a callback-based event source, wrapping it in an async generator (or an async iterable with a queue) is how you bring it into `for await..of`. Watch cancellation: `for await` calling `.return()` on `break` should abort the underlying source (`AbortController` again).

## Iterators Are Pull, Events Are Push

Iterators: consumer says `.next()` / `await next`. Events: producer fires whenever. Neither is "better." A chat socket is push (events / async iterable you don't control the rate of). A file you parse line by line is pull. Backpressure -- slowing the producer when the consumer is behind -- is the hard part of connecting them. Web Streams exist because this problem is real.

Don't wrap every event emitter in an async generator "because modern." If the consumer isn't pulling, you just built an unbounded queue.

## Students As An Iterable

Let's make the protocol less abstract. A classroom of IDs, pulled one at a time:

```js
var classroom = {
    ids: [ 14, 73, 112, 6 ],
    [Symbol.iterator]() {
        var i = 0;
        var ids = this.ids;
        return {
            next() {
                if (i >= ids.length) {
                    return { done: true };
                }
                return {
                    value: ids[i++],
                    done: false
                };
            }
        };
    }
};

for (let id of classroom) {
    console.log(id);
}
// 14 73 112 6
```

`for..of` asked `classroom` for an iterator, then called `.next()` until `done` was `true`. Spread (`[...classroom]`) does the same. That's all `for..of` is.

A generator writes that iterator for you:

```js
function* classroom(ids) {
    for (let id of ids) {
        yield id;
    }
}

[...classroom([ 14, 73 ])];     // [ 14, 73 ]
```

Now pause for I/O -- the `run` helper from earlier in this chapter -- and you have "give me the next student ID, fetch that student, then the next":

```js
function* loadClassroom(ids) {
    for (let id of ids) {
        let student = yield fetchStudent(id);
        console.log(student.name);
    }
}

run(loadClassroom,[ 14, 73, 112 ]);
```

Read that generator as if it were sync. Then remember `yield fetchStudent(id)` is a later card. `run` is the event loop's concierge. Chapter 5 names `run` `async`/`await` and lets the compiler write it.

### See The Pause

`loadClassroom` is three `fetchStudent`s that *look* like a `for` loop. Walk one iteration.

```js
function* loadClassroom(ids) {
    for (let id of ids) {
        let student = yield fetchStudent(id);
        console.log(student.name);
    }
}

run(loadClassroom,[ 73, 14 ]);
```

1. `run` calls `loadClassroom([ 73, 14 ])` -- that does **not** run the `for`. It returns an iterator.
2. `run` does `it.next()` with no inbound value. The generator runs until `yield fetchStudent(73)`. The *yielded* value is a promise (pending). The generator is paused; `student` is not assigned.
3. `run` sees `done: false`, does `Promise.resolve(thatPromise).then(handleNext)`. When Suzy arrives, `handleNext(suzy)` calls `it.next(suzy)`.
4. `"Suzy"` becomes the result of `yield`. `student` is Suzy. `console.log` runs *now* inside the generator. The `for` loops. `yield fetchStudent(14)` pauses again.
5. Same story for Kyle. Then the generator finishes. `run`'s promise fulfills.

If you `yield` *nothing* -- `yield;` or forget `yield` and just `fetchStudent(id)` -- `run` will `.next` immediately with `undefined` (or never wait). The fetches still start (if you called them), but the generator won't wait. That's the generator mistake `await` makes a syntax error... except people then `items.forEach(async ...)` and get the same bug in nicer clothes.

`for..of` on a generator that `yield`s promises does **not** wait for those promises. It pulls `{ value: Promise, done: false }` *now*. `for await..of` is the async iterator protocol. Mixing them up is how you log a room full of pending objects and call it done.

### `break` Still Calls `.return()`

```js
function* ids() {
    try {
        yield 73;
        yield 14;
    }
    finally {
        console.log("cleanup");
    }
}

for (let id of ids()) {
    console.log(id);
    break;
}
// 73
// cleanup
```

`break` is not "stop yielding and skip `finally`." The iterator protocol says the consumer bailed, so `.return()` runs. If this generator had a file handle or an `AbortController`, `finally` is where you abort. `async function*` plus `for await` plus `break` is the same contract. Chapter 6 will reuse that sentence for workers. The grain is: **putting the card down is not the same as forgetting to clean up.**

If this still feels like a parlor trick, implement `classroom`'s iterator by hand again, without `function*`. When `.next()` is boring, generators will be boring too -- in the good way.

Next chapter: the syntax you actually type -- `async` / `await` -- now that you know it's a generator runner and a promise factory wearing grammar. Don't skip the mistakes section there. The sugar is how people serialize three independent fetches by accident.
