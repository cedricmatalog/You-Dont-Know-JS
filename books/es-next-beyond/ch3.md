# You Don't Know JS Yet: ES.Next & Beyond - 2nd Edition
# Chapter 3: Collections, Iteration, And APIs

ES6 gave JS `Map`, `Set`, `WeakMap`, `WeakSet`, and the iterator protocol. The years after filled in the obvious holes: grouping, weak refs, iterator helpers, typed arrays growing up, promises combinators (*Sync & Async*), and "please clone this graph."

Use the built-in that matches the *problem*. A plain object is not a `Map`. An array is not a `Set`.

Let's make that painful with the two Kyles from Appendix B's neighborhood:

```js
var kyleA = { id: 14, name: "Kyle" };
var kyleB = { id: 99, name: "Kyle" };

var byObject = {};
byObject[kyleA] = "signed in";
byObject[kyleB] = "also signed in";

Object.keys(byObject);
// [ "[object Object]" ]   -- one key, second write won

var byMap = new Map();
byMap.set(kyleA,"signed in");
byMap.set(kyleB,"also signed in");

byMap.size;                  // 2
byMap.get(kyleA);            // "signed in"
```

`byObject[kyleA]` stringifies the key. That's *Types & Grammar* (ToString) biting *Objects & Classes* (identity). `Map` compares keys with `SameValueZero`. If the key is an object, you wanted `Map` (or `WeakMap`). Stay with this example until the object-key bug makes you angry. Then you'll stop writing `obj[user] = true`.

## Map And Set

```js
map = new Map();
map.set(key, value);
map.get(key);
map.has(key);
map.delete(key);

set = new Set(list);
set.add(value);
set.has(value);
```

`Map` keys can be **any value**, including objects, compared with `SameValueZero` (like `===` but `-0` and `0` are the same, and `NaN` matches `NaN`). Object keys stringify. That's the whole reason `Map` exists.

```js
obj = {};
obj[keyObject] = true;       // key becomes "[object Object]"
map.set(keyObject, true);    // key is the object
```

Iteration of a `Map` is in insertion order, entries as `[key, value]`. `Set` iterates values. Both are iterable.

When the key is a string/symbol and the lifetime is "as long as this record," a plain object or `Object.create(null)` is still fine. When the key is an object, or you need insertion order with non-string keys, `Map`.

`WeakMap` / `WeakSet` hold **objects** (and some host objects; not primitives -- except that later proposals keep poking at this) **weakly**: if nothing else references the key, it can be GC'd. No iteration (that would observe GC). Perfect for private bookkeeping (*Objects & Classes* Appendix B) and caches you don't want to leak.

### See The Two Kyles

Stay on the sign-in log until the object-key bug is muscle memory.

```js
function makeSignInWrong() {
    var signed = {};
    return {
        signIn(person) {
            signed[person] = true;
        },
        hasSignedIn(person) {
            return signed[person] == true;
        }
    };
}

var log = makeSignInWrong();
log.signIn(kyleA);
log.hasSignedIn(kyleB);      // true  -- BUG
```

`signed[person]` is `signed[String(person)]` is `signed["[object Object]"]`. One slot. Appendix B asks you to fix this with `WeakSet`. The *types* reason is ToString on a property key (*Types & Grammar*). The *collections* reason is: **object identity is not a string.** `Map` / `WeakMap` / `Set` / `WeakSet` exist so you stop flattening identity into a key you can print.

`signed[person.id]` is a different program: two objects with `id: 14` become one person. That's correct for a database primary key and wrong for "this object instance clicked the button." Name which program you are writing.

## WeakRef And FinalizationRegistry

```js
ref = new WeakRef(obj);
obj2 = ref.deref();          // obj or undefined if GC'd

registry = new FinalizationRegistry(function cleanup(held){
    // obj was GC'd; held is the token you registered, NOT the obj
});
registry.register(obj, heldValue);
```

These are **not** "free destructors." GC is not deterministic. `cleanup` may run late, never in a test, twice across implementations' moods. Don't manage resource handles (files, sockets) with `FinalizationRegistry`. Close them yourself (`try..finally`, `using` if you have it). WeakRef caches are allowed to miss. If a miss is a bug, you wanted a strong `Map`.

## Grouping

```js
rows = [
    { type: "fruit", name: "apple" },
    { type: "veg", name: "carrot" },
    { type: "fruit", name: "pear" }
];

Object.groupBy(rows, row => row.type);
// { fruit: [ ... ], veg: [ ... ] }

Map.groupBy(rows, row => row.type);
// Map { "fruit" => [ ... ], "veg" => [ ... ] }
```

`Object.groupBy` keys are strings (ToString). `Map.groupBy` keys are whatever the callback returns. That's the `Map` vs object lesson again.

## Iterator Helpers

Iterators grew methods in the ES2025 era: `.map(..)`, `.filter(..)`, `.take(..)`, `.drop(..)`, `.flatMap(..)`, `.reduce(..)`, `.toArray(..)`, `.forEach(..)`, `.some(..)`, `.every(..)`, `.find(..)`, plus static `Iterator.from(..)`.

```js
result = Iterator.from(infinite)
    .filter(x => x % 2 == 0)
    .take(10)
    .toArray();
```

Unlike array methods, these are **lazy**. The infinite iterable doesn't explode until you pull. That's the point. Don't `.toArray()` in the middle unless you need random access.

```js
function* ids() {
    yield 14;
    yield 73;
    yield 112;
    yield 6;
}

var names = Iterator.from(ids())
    .filter(function evenish(id){
        return id % 2 == 0;
    })
    .map(function label(id){
        return "student:" + id;
    })
    .toArray();

names;
// [ "student:14", "student:112", "student:6" ]
```

`filter` / `map` here did not build intermediate arrays of 4, then 3. They pulled. For four IDs it does not matter. For a generator that yields from a 10GB file it does. Array `.filter().map()` is still the right tool for a classroom list of 30 that you already have in memory -- engines optimize that path to death. Don't rewrite it as iterators to look modern.

Arrays already have eager versions. Don't rewrite `arr.filter(..).map(..)` as iterators "for performance" without measuring; arrays are heavily optimized. Do use helpers when you *have* an iterator (a generator, a DOM collection you don't want to materialize, a pagination stream).

## Typed Arrays, Buffers, And Bytes

`ArrayBuffer` is a bag of bytes. Typed arrays (`Uint8Array`, `Int32Array`, `Float64Array`, `BigInt64Array`, `Float16Array` where it exists) are *views*. `DataView` is a view with explicit endianness.

Resizable / growable buffers (later ES) let you `resize` instead of allocating a new buffer and copying. SharedArrayBuffer is the shared cousin (*Sync & Async* Chapter 6).

`TextEncoder` / `TextDecoder` turn strings into bytes and back (UTF-8). Don't roll your own UTF-8.

If you are processing images, audio, wasm, or network protocols, live here. If you are processing users, live in objects and strings.

## `Object` Odds And Ends

* `Object.hasOwn(obj, key)` -- static, preferred over `obj.hasOwnProperty(key)` (*Objects & Classes*).
* `Object.fromEntries(iterable)` -- inverse of `Object.entries`.
* `Object.is(a, b)` -- `SameValue` (`NaN` equals `NaN`, `-0` not equal to `0`).
* `structuredClone(value, { transfer })` -- deep clone.
* `{ ...obj }` vs `Object.assign(target, src)` -- assign mutates `target` and copies getters as *values*.

## `Array` Odds And Ends

* `Array.from(iterable, mapFn)` / `Array.fromAsync(asyncIterable)` -- construct arrays from (async) iterables.
* `.at(-1)` -- last element, no `arr[arr.length - 1]`.
* `.flat(depth)` / `.flatMap(fn)`
* `.findLast(..)` / `.findLastIndex(..)`
* `.toSorted()` / `.toReversed()` / `.toSpliced()` / `.with(index, value)` -- **copying** versions of mutating methods. Use these when you didn't mean to shuffle someone else's array.
* `.group` was a prototype method; it became `Object.groupBy`. Don't use the old name.

## Intl Is Not Optional

`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.Collator`, `Intl.Segmenter`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.PluralRules` -- this is how you show things to humans. String concatenation with `$` and hardcoded `"st, nd, rd"` is how you insult every locale you didn't test.

Temporal (next chapter) + `Intl` is the modern date *display* story. `Date#toLocaleString` was the old compromise.

## URL, URLSearchParams, URLPattern

`new URL(string, base)` parses URLs correctly. String split on `?` does not. `URLSearchParams` is the query string. `URLPattern` (where hosted) is pattern matching against URLs. Prefer these over regexes for URLs.

### See The Group

```js
var rows = [
    { id: 14, track: "core" },
    { id: 73, track: "core" },
    { id: 6, track: "elective" }
];

var byTrack = Object.groupBy(rows, function trackOf(row){
    return row.track;
});

byTrack.core.map(function id(r){ return r.id; });
// [ 14, 73 ]
```

`Object.groupBy` ToString's the callback's return as the property name. Fine for `"core"`. Fatal for a `track` object: you'd get `"[object Object]"` and smash groups together -- the two-Kyles bug again. `Map.groupBy` keeps the object key. If the callback returns a number `1`, `Object.groupBy` still gives you a string key `"1"`. That's *Types & Grammar* on object keys, in a method that looks like lodash.

Copying array methods (`.toSorted()`, `.with(i, v)`) exist because `.sort()` mutates and people pass arrays through React state. If you own the array and you meant to mutate, `.sort()` is still honest. If the array arrived as an argument you shouldn't shuffle, copy. The new methods are not "more functional JS." They are "I noticed the mutation."

`structuredClone(classroom)` walks the graph. Functions throw. That's the honest error. `{ ...classroom }` copies one layer. Know which clone you bought.

### `Set` Is Not Unique Objects-By-Contents

```js
var a = { id: 73 };
var b = { id: 73 };
var s = new Set([ a, b ]);
s.size;                      // 2
```

`Set` uses SameValueZero. Two object literals are two identities. If you wanted unique student *ids*, key a `Map` by `id` or a `Set` of ids. Chapter 3's opening two-Kyles example is this fact. I am repeating it because it is the collections pillar in one line.

`Array.fromAsync(pages())` is the async-iterator cousin of `Array.from`. It belongs with *Sync & Async* Chapter 4. Don't `for await` into a `push` loop unless you need to break early -- then an async iterator helper / `for await` is correct.

### `Object.hasOwn` vs `in` vs `hasOwnProperty`

```js
var suzy = Object.create({ track: "core" });
suzy.id = 73;

"track" in suzy;             // true -- chain
Object.hasOwn(suzy,"track"); // false -- own only
Object.hasOwn(suzy,"id");    // true
suzy.hasOwnProperty("id");   // true -- unless someone put a key named hasOwnProperty
```

Chapter 2 of *Objects & Classes* already picked this. The ES.Next reminder is: **`Object.hasOwn` is the static that doesn't break when the object has a same-named own method.** `Map.prototype.has` is a different universe -- identity keys, no prototype chain of *your* data. Don't `in` a Map. Don't `.has` a POJO expecting Map semantics.

`Object.fromEntries(map)` is how you *flatten* a Map to a string-key object (ToString keys). The two Kyles become one key if you stringify objects. Round-trip only if keys were strings.

### WeakSet Sign-In Is Identity

Appendix B's `makeSignIn` uses `WeakSet` so two `{ id: 14 }` objects are two people. A `Set` of ids is a *different* program (database key). A POJO keyed by `person` is ToString. Three collections, three questions. If your type is "this object in memory," WeakSet/WeakMap. If your type is "this primary key," Map keyed by id or a Set of ids. If you don't know, you will pick the POJO and get one `[object Object]` slot.

### `toSorted` Does Not Sort In Place

```js
var ids = [ 73, 14, 6 ];
var a = ids.toSorted(function(x,y){ return x - y; });
ids;                         // still [ 73, 14, 6 ]
a;                           // [ 6, 14, 73 ]
ids.sort(function(x,y){ return x - y; });
ids;                         // mutated
```

If `ids` is React state or a shared classroom list, mutate is a bug. If `ids` is a local you own and you meant to reorder, `.sort()` is honest. The copying methods are not morally better. They are the ones that match "I did not mean to shuffle the argument."

Use the built-in that matches the *question*: identity keys (`Map`), uniqueness of primitives (`Set`), GC-aware identity (`Weak*`), lazy pull (iterator helpers), bytes (typed arrays), humans (`Intl`), URLs (`URL`). A POJO is still fine for a record with known string fields. The crime is using one collection as if it were another.

That's the chapter: pick the collection that matches identity vs string keys vs GC vs pull vs bytes vs humans. If you finish still stuffing object keys into POJOs, re-read the two Kyles until you're angry. Then Appendix B.

`Intl` formats. Temporal stores. `URL` parses. Typed arrays are bytes. Iterator helpers pull. `Map` identity. If you remember only that list as *questions*, you don't need a catalog tattooed on your arm.

Don't `for..in` a `Map`. Don't `JSON.stringify` a `Set` and expect to get a Set back. Don't `groupBy` an object key on `Object`. Those three are the chapter's fail-closed tests.

Then Temporal. Dates are types. Collections were identity. You need both or you'll store a birthday as a `Map` key via `Date` and wonder why Tuesday moved.

Walk the two-Kyles table one more time before you leave:

```js
var kyleA = { id: 14, name: "Kyle" };
var kyleB = { id: 14, name: "Kyle" };
var byObject = new Map();
var byId = new Map();

byObject.set(kyleA, true);
byObject.get(kyleB);         // undefined -- different object
byId.set(kyleA.id, true);
byId.get(kyleB.id);          // true -- same primary key
```

`WeakSet` of person objects is the first column (identity, GC). `Map` of ids is the second (database). A POJO `signedIn[kyleA] = true` is neither: it ToString's to `"[object Object]"` and collides. Three programs. Pick one on purpose.

Chapter 4 is the big one that `Date` veterans have been waiting a decade for: Temporal, now actually JS.
