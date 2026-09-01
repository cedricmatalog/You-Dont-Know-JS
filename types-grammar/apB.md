# You Don't Know JS Yet: Types & Grammar - 2nd Edition
# Appendix B: Practice

This appendix aims to give you some exercises to test and solidify your understanding of types, coercion, and grammar from this book. Try them in an editor. No cheating!

## Coercive Meeting Times

This is the same *shape* of exercise as *Get Started* Appendix B, but now you should be able to *name* the coercions.

`scheduleMeeting(..)` takes a start time (24-hour `"h:mm"` or `"hh:mm"`) and a duration in minutes. Return `true` if the meeting falls entirely within `dayStart` / `dayEnd`.

```js
var dayStart = "07:30";
var dayEnd = "17:45";

function scheduleMeeting(startTime,durationMinutes) {
    // ..TODO..
}

scheduleMeeting("7:00",15);     // false
scheduleMeeting("07:15",30);    // false
scheduleMeeting("7:30",30);     // true
scheduleMeeting("11:30",60);    // true
scheduleMeeting("17:00",45);    // true
scheduleMeeting("17:30",30);    // false
scheduleMeeting("18:00",15);    // false
```

After it works, list every `ToNumber` / `ToString` / `ToBoolean` you relied on. If you used `==`, say so on purpose.

## What Does This Parse As?

Without running, rewrite each snippet as the parser sees it (insert the ASI semicolons, mark blocks vs objects). Then run.

```js
// 1
function foo() {
    return
    {
        bar: 1
    };
}

// 2
var a = 1
var b = 2
[a,b].forEach(v => console.log(v))

// 3
var x = 0
++x
console.log(x)
```

## Nullish vs Falsy Config

Write `pickPort(config)` that:

* uses `config.port` when it is a number, **including `0`**
* uses `80` when `port` is `null`, `undefined`, or missing
* does **not** treat `""` as 80 if someone passed a string port -- throw a `TypeError` instead

```js
pickPort({ port: 0 });          // 0
pickPort({ port: 443 });        // 443
pickPort({});                   // 80
pickPort({ port: null });       // 80
pickPort({ port: "" });         // TypeError
```

Use `??` or an explicit `== null` check. Do not use `||` for the default.

## Boxed Or Primitive?

Without running, for each value write `typeof`, ToBoolean (`if (v)`), and whether `.valueOf()` differs from `v`:

```js
var a = false;
var b = new Boolean(false);
var c = "Kyle";
var d = new String("Kyle");
var e = 0;
var f = new Number(0);
```

Then run. The wrappers are the Chapter 3 trap. Your notes should say *why* `if (b)` runs.

## Holes And `map`

Without running, write what this logs, then run:

```js
var a = [];
a[0] = "Kyle";
a[2] = "Suzy";
a.map(function(v,i){
    console.log(i, v);
    return v;
});
```

Then the same with `[ "Kyle", undefined, "Suzy" ]`. The hole skips the callback. The `undefined` slot does not. Chapter 3.

## `==` Or `===`

Rewrite these so they don't use `==`. Keep the same results for the inputs shown. Name the coercion you replaced.

```js
function isMissing(x) {
    return x == null;        // null or undefined -- this one may stay
}

function isPortOpen(port) {
    return port == 80;       // bad if port is "80" or true
}
```

## ASI `return`

Write a function that was *supposed* to return `{ ok: true }` but ASI made it return `undefined`. Then fix it.

## `Boolean(new Boolean(false))`

What does it return, and why? Then `if (new Boolean(false))`.

## `+` Concat Trap

What is `[73] + 1`? Why? Rewrite as numbers.

## `typeof null`

What is `typeof null`? What check do you use instead for "is this a POJO?"

Once you have answers, *compare* to "Suggested Solutions" at the end of this appendix.

## Suggested Solutions

Keep in mind that these suggested solutions are just that: suggestions. There are many different ways to solve these practice exercises. Compare your approach to what you see here, and consider the pros and cons of each.

Suggested solution for "Coercive Meeting Times":

```js
var dayStart = "07:30";
var dayEnd = "17:45";

function toMinutes(hhmm) {
    var parts = String(hhmm).split(":");
    var hours = Number(parts[0]);
    var mins = Number(parts[1] == null ? 0 : parts[1]);
    return (hours * 60) + mins;
}

function scheduleMeeting(startTime,durationMinutes) {
    var start = toMinutes(startTime);
    var end = start + Number(durationMinutes);
    return start >= toMinutes(dayStart) &&
        end <= toMinutes(dayEnd);
}
```

`String(hhmm)` is explicit ToString so `"7:30"` and `7` (if someone passed a number) don't surprise you the same way. `Number(..)` is explicit ToNumber. The `&&` is ToBoolean of the comparisons -- the comparisons themselves are already booleans, so that's boring on purpose.

----

Suggested solution for "What Does This Parse As?":

```js
// 1 -- return; then a block with label `bar`
function foo() {
    return;
    {
        bar: 1;
    }
}
// foo() === undefined

// 2 -- `var b = 2[a,b].forEach(...)` is a syntax error
//      or, with ASI after 2, an array forEach.
//      Without a semicolon after `2`, `[` continues the
//      previous statement. Put the semicolon.

var a = 1;
var b = 2;
[a,b].forEach(v => console.log(v));

// 3 -- `++` prefix after a newline is fine as its own
//      statement; postfix `x++` on the next line after `x`
//      would be a restricted-production trap if written
//      as `x\n++`.
var x = 0;
++x;
console.log(x);    // 1
```

----

Suggested solution for "Nullish vs Falsy Config":

```js
function pickPort(config) {
    var port = config.port;
    if (port === "") {
        throw new TypeError("port must be a number");
    }
    var picked = port ?? 80;
    if (typeof picked != "number") {
        throw new TypeError("port must be a number");
    }
    return picked;
}
```

`??` is the grammar for "only substitute nullish." `||` would have turned `0` into `80` and failed the first assertion of the exercise.

Suggested solution for "Boxed Or Primitive?":

| value | typeof | `if (v)` | notes |
| :--- | :--- | :--- | :--- |
| `false` | `"boolean"` | skip | primitive |
| `new Boolean(false)` | `"object"` | **enter** | object is truthy; `valueOf()` is `false` |
| `"Kyle"` | `"string"` | enter | non-empty string |
| `new String("Kyle")` | `"object"` | enter | wrapper; `== "Kyle"` may coerce |
| `0` | `"number"` | skip | |
| `new Number(0)` | `"object"` | **enter** | same trap as Boolean |

Never `new` the fundamental wrappers. Auto-boxing is enough for `"Kyle".length`.

Suggested solution for "Holes And `map`":

The sparse array logs `0 Kyle` and `2 Suzy` -- no `1`. The dense array logs `1 undefined` as well. `map` still returns length 3 (holes preserved in the result on most engines -- check yours). Don't write `new Array(n)` if you meant `n` placeholders you will `map` over; `fill` first or use a literal.

Suggested solution for "`==` Or `===`":

`isMissing` may keep `== null` as the *intentional* nullish check (or `x === null || x === undefined`). `isPortOpen` should be `port === 80`. If you need to accept `"80"`, `Number(port) === 80` after validating it's a numeric string -- that's explicit, not `==`.

Suggested solution for "ASI `return`":

```js
function broken() {
    return
    {
        ok: true
    };
}
broken();                    // undefined -- ASI inserted return;

function fixed() {
    return {
        ok: true
    };
}
```

`return` newline `{` is `return;` plus a block. Put `{` on the `return` line, or `return ({ ok: true })`. Chapter 5.

Suggested solution for "`Boolean(new Boolean(false))`":

`Boolean(object)` is ToBoolean of an object -- `true`. Same as `if`. `valueOf()` is the primitive `false`. Chapter 3 / Appendix A.

Suggested solution for "`+` Concat Trap":

`[73] + 1` is `"731"` because ToPrimitive of the array is `"73"`. `Number(a[0]) + 1` or don't store ids as one-element arrays.

Suggested solution for "`typeof null`":

`"object"`. `x != null && typeof x == "object" && !Array.isArray(x)` -- or a branded helper. Never `typeof x == "object"` alone.

That's meeting times, ASI, nullish port, boxed wrappers, holes, `==`, `return {`, `Boolean(wrapper)`, `+` concat, and `typeof null` -- enough to make coercion and grammar *finger memory*. If a drill felt too easy, change the input until it isn't.

Run every drill. Then break one on purpose (`||` instead of `??`, `new Boolean(false)` in `if`, `return` newline `{`). The break is the lesson. That's *Get Started* Appendix B's "compare your approach" aimed at types.

Keep practicing on your own code: every `if (x)` and every `+` is a coercion. Name them.

If `pickPort({ port: 0 })` returned `80`, you used `||`. If `scheduleMeeting` treated `"7:30"` as later than `"17:45"` because you compared strings, you skipped `ToNumber` of minutes. If `if (new Boolean(false))` surprised you, you still think `Boolean` the type and `Boolean` the wrapper are one thing. Three misses, three chapters. Re-run the drill that failed before you argue with the table.

```js
scheduleMeeting("7:30",30);  // must be true -- "7:30" ToNumber's
pickPort({ port: 0 });       // must be 0 -- not ||
if (new Boolean(false)) {
    console.log("entered");  // prints -- object is truthy
}
```

Predict, then run. If any of the three surprises you, that drill is the appendix. The suggested solutions are not a spoilers file; they are the names of the abstract operations you just stepped on.

```js
function brokenReturn() {
    return
    { ok: true };
}
brokenReturn();              // undefined

[73] + 1;                    // "731"
typeof null;                 // "object"
```

ASI, ToPrimitive concat, `typeof` lie. Three more landmines from the drill list. If you only practiced `scheduleMeeting`, you practiced *Get Started* again. This appendix wanted the types *named*.

NOTE:
`typeof foo == "undefined"` is how you feature-detect a *binding* that might be undeclared. `typeof x == "object"` is not how you feature-detect a POJO -- `null` lies. Two `typeof`s, two jobs. Don't mix them.