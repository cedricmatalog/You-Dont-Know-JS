# You Don't Know JS Yet: ES.Next & Beyond - 2nd Edition
# Chapter 2: Syntax We've Absorbed

ES6 felt like a new language. Everything since has felt like "of course JS has that" -- until you watch someone write `&&` chains instead of `?.`, or `||` for defaults that should be `??`, or a `for` loop to group rows that `Object.groupBy` already names.

This chapter is not a catalog of every yearly delta. It's the syntax and small APIs I want in your fingers, with the sharp edges the release notes skip.

## Property Access That Might Not Be There

```js
city = record.location?.city;
name = record.getName?.();
first = items?.[0];
```

Optional chaining: if the value before `?.` is `null` or `undefined`, the expression is `undefined` and the rest does not run. It does **not** check truthiness. `0?.toFixed(2)` is `"0.00"`.

You cannot assign through it (`a?.b = 1` is a syntax error). You should not use it to hide bugs (`data?.foo?.bar?.baz` six levels deep usually means you don't know your data). Use it at *real* boundaries: "this key might be absent," "this API might not exist."

Let's put a student record through it, slowly:

```js
var suzy = {
    id: 73,
    name: "Suzy",
    enrollment: {
        courses: [ "YDKJS" ]
    }
};

var kyle = {
    id: 14,
    name: "Kyle"
    // no enrollment
};

function firstCourse(student) {
    return student.enrollment?.courses?.[0] ?? "none";
}

firstCourse(suzy);           // "YDKJS"
firstCourse(kyle);           // "none"
firstCourse(null);           // "none" -- student itself nullish
```

`kyle.enrollment && kyle.enrollment.courses[0]` would also "work" here because missing `enrollment` is `undefined` (falsy *and* nullish). The day `enrollment` is `0` because someone reused a field, `&&` lies and `?.` doesn't. That's *Types & Grammar* Chapter 5 again. This chapter is just: the syntax is in your baseline now, so use the one that matches the question you are asking.

`student.enrollment?.courses[0]` without `?.` before `[0]` still throws if `courses` is missing -- optional chaining is not a virus that infects the rest of the line. Each `?.` is its own short-circuit point.

Calls and `new` have the same rule:

```js
record.getName?.();          // skip the call if getName is nullish
new record.Ctor?.();         // skip `new` if Ctor is nullish
```

`record.getName()` without `?.` throws if `getName` is missing. `record.getName?.()` returns `undefined`. `record.getName?.() ?? "anon"` is the full "maybe no method, maybe no name" boundary. Six `?.` in a row is still a smell: you don't know the shape.

## Nullish Defaults

```js
port = config.port ?? 80;
volume = settings.volume ?? 0.8;
```

`??` substitutes only for `null` and `undefined`. `||` also substitutes for `0`, `""`, `false`, `NaN`. Volume `0` is a value. Empty string as a stored name may be a value. Default those with `??`, not `||`.

Mixing `??` with `&&` / `||` requires parentheses. That's a syntax error on purpose.

Logical assignment combines both ideas:

```js
settings.volume ??= 0.8;     // assign only if nullish
flags.debug ||= true;        // assign only if falsy
cache.key &&= next;          // assign only if truthy
```

`??=` is the one I want you to actually use. `||=` on numbers is how you accidentally refuse `0`.

## Rest, Spread, And Shallow Copies

```js
var { a, ...rest } = obj;
var clone = { ...obj };
var merged = { ...defaults, ...overrides };

var [ first, ...tail ] = list;
var copy = [ ...list ];
```

Object spread is **shallow**, own enumerable string keys (and, for `{...obj}`, own enumerable symbols too). Prototype properties are not copied. Getters *run*. Nested objects are shared by reference. `{ ...user, user.address.city = "X" }` is not a thing -- you mutate or you spread nested layers yourself.

```js
var suzy = {
    name: "Suzy",
    enrollment: { courses: [ "YDKJS" ] }
};

var copy = { ...suzy };
copy.enrollment.courses.push("Functional-Lite");

suzy.enrollment.courses;
// [ "YDKJS", "Functional-Lite" ]  -- not a copy of the inner object
```

I still see `{ ...state, ...action }` in reducers that then mutate `state.enrollment`. Spread made a new *shell*. The guts are shared. `structuredClone(suzy)` copies the graph (and fails on functions, which is the honest error). `JSON.parse(JSON.stringify(suzy))` is the old cheap deep clone with the old cheap bugs (`undefined` dropped, `Date` become strings). Pick the clone that matches the data.

`structuredClone(obj)` is the built-in deep clone for a large class of data (not functions, not DOM nodes). Use it when shallow was a bug, not when you "might need deep someday."

Array spread uses the **iterator** protocol. It's not `Object.assign` for arrays. Sparse arrays get densified. Arguments to `Math.max(...nums)` will explode the stack if `nums` is huge -- use a loop or `Math.max` with a reducing strategy.

## Numeric Separators And BigInt

```js
budget = 1_000_000;
mask = 0xFF_FF_FF;
huge = 2n ** 64n;
```

`_` in numbers is sugar. `bigint` is a separate primitive (*Types & Grammar*). Don't mix `number` and `bigint` in arithmetic without an explicit conversion you could defend.

## Tagged Templates

```js
function sql(strings, ...values) {
    // strings is the raw text between interpolations
    // values are the interpolated expressions
    return { strings, values };
}

query = sql`SELECT * FROM users WHERE id = ${ userId }`;
```

Tagged templates are how DSLs (SQL, CSS-in-JS, localization, sanitization) get *structure*, not just concatenated strings. `String.raw` is the built-in tag that ignores escape processing. Don't reinvent `sql` badly -- interpolation in SQL is how you get injection. The *point* of a tag is to treat values as parameters, not as source text.

```js
function sql(strings,...values) {
    var text = strings[0];
    var params = [];
    for (let i = 0; i < values.length; i++) {
        params.push(values[i]);
        text += "$" + (i + 1) + strings[i + 1];
    }
    return { text, params };
}

var userId = 73;
sql`SELECT * FROM students WHERE id = ${ userId }`;
// { text: "SELECT * FROM students WHERE id = $1", params: [ 73 ] }
```

The tag *saw* 73 as a value, not as characters glued into the query. `` `SELECT * FROM students WHERE id = ${ userId }` `` without a tag is the injection. Grammar gave you a hook. Use it, or don't interpolate SQL at all.

## `import()` And Import Attributes

Static `import` is *Scope & Closures* / modules. Dynamic `import(specifier)` returns a **promise** for the module namespace. Use it for code-splitting and conditional loading, not as a substitute for static imports you were too lazy to write (static analysis, tree-shaking, and TDZ all prefer static `import`).

Import *attributes* (the `with` clause; formerly "assertions") tell the runtime what the module *is*:

```js
config = await import("./config.json", {
    with: { type: "json" }
});
```

JSON modules, CSS modules (in some hosts), and future types hang off this. The attribute is not a MIME guess you skip. It's part of the module graph's integrity.

`import.meta` is the host-provided metadata for the current module (`import.meta.url` is the one you actually use, to resolve adjacent files).

## Error Cause And `Error.isError`

```js
throw new Error("save failed", { cause: err });
```

`error.cause` chains the underlying error. Log it. Don't squash it into a string. `Error.isError(x)` (where available) is the brand check that `instanceof Error` isn't, across realms.

`Error.captureStackTrace` (V8) and friends are host extras. Prefer standard `cause` and `name` / `message`.

## Small Syntax That Still Trips People

**Trailing commas** are legal in many lists (params, calls, arrays, objects, `import`/`export`). Use them for cleaner diffs. Don't fight them.

**`new.target`** in a function tells you whether it was called with `new`. `class` constructors already throw without `new`. Useful in dual factory/constructors you probably shouldn't be writing.

**`globalThis`** is the global object across browsers, Node, workers. Not `window`, not `self`, not `global`, unless you *mean* a specific host.

**Numeric separators, `BigInt`, optional catch binding** (`catch { }`), **`s` / `d` / `v` regexp flags**, **lookbehind** in regexps -- all language now. If your style guide froze in 2017, thaw it.

## Decorators (Almost Absorbed)

Decorators (`@foo class Bar`) spent nearly a decade in the wrong syntax. The version that is standardizing is **stage 3+** (check the year you are reading this): decorators are functions applied to class elements, with a context object, designed to compose with `class` fields and `#` privacy.

I am not printing a tutorial that will rot. If your framework (Angular, Lit, some backend meta-programming) documents a decorator version, use *that* version and pin your compiler. Don't mix Babel's 2018 decorators with TypeScript's experimentalDecorators and the standard. They are different languages that share an `@`.

When in doubt, a wrapping function or a `class` static is clearer than a decorator you can't explain.

### See The Config

`??` vs `||` is the syntax I still mark in code review more than `?.`. A classroom config:

```js
function pickVolume(settings) {
    return settings.volume || 0.8;
}

pickVolume({ volume: 0 });   // 0.8  -- BUG: mute is a value
pickVolume({ volume: 0.5 }); // 0.5
pickVolume({});              // 0.8
```

`0` is falsy (*Types & Grammar*). `||` asked ToBoolean. The product question was "is volume missing?" which is nullish, not falsy.

```js
function pickVolume(settings) {
    return settings.volume ?? 0.8;
}

pickVolume({ volume: 0 });   // 0
```

`settings.volume ??= 0.8` is the same question as assignment: write only if missing. `settings.debug ||= true` will skip writing if `debug` is `false` -- sometimes you mean that (already disabled), sometimes you meant "unset." Name the question.

`import()` is Chapter 5 of *Sync & Async* wearing a module specifier. It returns a promise *now*. The namespace is *later*. Static `import` is *Scope & Closures* Chapter 8: bindings, TDZ, one evaluation. Don't `import()` a file you always need because "dynamic looks modern." The bundler cannot tree-shake a string you compute at runtime as well as a static specifier. Conditional `import()` of a polyfill *after* a `typeof` check is the grain.

### `??` Mixes Need Parens

```js
// SyntaxError without parens:
// record && record.port ?? 80

var port = (record && record.port) ?? 80;
var port2 = record?.port ?? 80;
```

The grammar refused to guess whether `&&` or `??` binds tighter in a way you'd debate. Parenthesize, or use `?.` so you never wrote the `&&`. That's Chapter 2 of *Types & Grammar* wearing new punctuation.

`catch { }` (optional catch binding) is for "I don't need the error object." Prefer naming `err` and logging it. Empty `catch { }` is still empty `catch`.

### Spread Copies Enumerables, Assign Copies Getters As Values

```js
var suzy = {
    get name() { return "Suzy"; },
    id: 73
};

var a = { ...suzy };
var b = Object.assign({}, suzy);

a.name;                      // "Suzy" -- getter ran, own data property now
b.name;                      // "Suzy" -- same
```

Both ran the getter *once* at copy time. Neither copied the getter. Later `suzy` changing (if it could) would not change `a.name`. That's shallow *and* eager. People think spread "copies the descriptor." It copies the *completion value* of the get, for enumerable own keys.

`Object.defineProperty` on the source with `enumerable: false` is skipped by spread. `Object.assign` same. Hidden fields don't travel. That's why class `#` privacy isn't defeated by `{ ...instance }` -- those slots aren't enumerable own data properties in the spread sense.

### Numeric Separators Are Not Underscore In Strings

```js
1_000 === 1000;              // true
"1_000";                     // a string with an underscore, not a number
Number("1_000");             // NaN
```

The `_` is grammar inside numeric literals. `Number.parseInt("1_000",10)` is `1` -- prefix parse, underscore stops it. Don't put separators in data you `JSON.parse`; JSON has no `_` in numbers. That's a syntax feature, not a ToNumber feature.

### Tagged Templates Are Not Interpolation

Chapter 2's `sql` tag turned values into `$1` parameters. The untagged template glued them into source. The grammar difference is the tag identity: `` sql`...` `` calls a function with a strings array. `` `...` `` is ToString of holes into one string. If you "just add a tag later," you change the meaning of every hole. That's not a refactor; that's a new DSL.

That's the syntax I want in your fingers: `?.` at real boundaries, `??` for missing, spread as shallow, tags as structure, `import()` as a promise. The sharp edges are the book. The catalog is MDN.

If you only remember one pair from this chapter: `||` vs `??`, and "spread is a new shell." Those two bugs are still in production in 2026. The rest is MDN when you need a flag.

`?.` is the one people overuse. `??` is the one people underuse. Spread is the one people think is deep. Tags are the one people treat as strings. `import()` is the one people use instead of static `import`. Five mistakes. This chapter is those five, with students.

Don't skip the `sql` tag because it looked like a library demo. It's the grammar hook. Untagged interpolation of user input is how you get injection; tagged parameters are how you don't. That's as much "ES.Next" as Temporal, and it shipped years earlier.

Read the `firstCourse` snippet again until `kyle.enrollment?.courses?.[0]` vs `kyle.enrollment.courses[0]` is obvious in your sleep. Then you're done with Chapter 2's sharpest edge.

Walk it once more with Kyle missing `enrollment`, Suzy with an empty `courses`, and a bug where `firstCourse(73)` was called with an id. `?.` saves Kyle and Suzy. It must **not** save `73` -- that's `typeof student == "object"` (and not `null`) before you chain. Syntax is not a type system. It is a shorter `&&` for *nullish* steps you already believed were optional.

Chapter 3 is the built-in *objects and methods* that grew up alongside this syntax: maps, sets, iterators, grouping, and the "why is this not an array" collections.

`import()` is a promise *now* and a module *later* -- Book 5's two worlds, wearing a function. Static `import` is the graph. Don't `import()` a file you could have listed at the top just because dynamic felt modern. That's Chapter 2's last sharp edge next to `?.`: both are shorter spellings of something you already owed a name (`&&` chain, or a later card).

```js
console.log("now");
import("./mod.js").then(function(){
    console.log("later");
});
console.log("still now");
```

If you predicted `later` between the two `now`s, you collapsed worlds -- go back to Book 5 Chapter 1, then return. The syntax is ES.Next. The timing is not.

Spread is a new shell, not a deep clone. `??` is missing, not falsy. Two sentences you can put on a sticky note next to the `import()` snippet.

`kyle.enrollment?.courses?.[0]` vs `kyle.enrollment.courses[0]`: one missing field vs one throw. Sleep on that pair. Then Chapter 3.
