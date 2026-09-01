# You Don't Know JS Yet: Types & Grammar - 2nd Edition
# Appendix A: Exploring Further

Chapter 5 could have been its own book. Here are a few productions I cut so the main chapter could finish, but that will still bite you.

## `with` Is Gone (Treat It That Way)

`with (obj) { foo = 1 }` adds `obj` to the scope chain at runtime. That's dynamic scope, which *Scope & Closures* spent a book telling you JS does *not* have -- except this relic.

It is a syntax error in strict mode. It is a performance and correctness disaster in sloppy mode (`foo` might be a property or a lexical binding depending on `obj`). You should never write it. You should be able to *read* it in a 2009 codebase and know why it is being deleted.

## HTML Comments, Because Browsers

```js
<!-- this is treated as a single-line comment in HTML-integrated JS
-->
```

Appendix B of the spec (web compatibility) still documents HTML-like comments in script grammar. Don't use them. Don't be shocked if a minifier or a `<!--` in a template shows up as a comment. Hosts leak.

## `typeof` And Undeclared

```js
typeof notDeclaredAtAll;     // "undefined" -- no ReferenceError
typeof notDeclaredAtAll.foo; // ReferenceError
```

`typeof` on a bare undeclared identifier is a special case in the grammar/runtime so feature detection doesn't throw. `typeof` on a member expression is not special -- it evaluates the base first. This is why `typeof foo !== "undefined"` is the old guard for "is this global around?" and why you should prefer `typeof globalThis.foo !== "undefined"` or `"foo" in globalThis` when you mean the global.

## `delete`

`delete obj.prop` is an operator with a completion value (`true`/`false`) and strict-mode throws. `delete someBinding` on a lexical `let`/`const`/`class` is a syntax error. `delete` on an array index leaves a hole (sparse array) -- it does not reindex. Prefer `splice` if you meant "remove this element."

The operator looks like a statement. It is an expression. `delete foo.bar, baz` is the comma operator after a delete. Parenthesize if you must mix.

## Template Literal Grammar

```js
`line ${
    student.name
} end`
```

The `${ .. }` hole is an *expression* (you can put `await`, calls, even nested templates). It is not a statement list. `if` doesn't go there without a ternary or a function call.

Tagged templates get a `strings` array with `.raw` (before escape processing). `String.raw` is the built-in tag. Backticks inside a template need escaping or a nested hole. This is grammar, not a library.

## You Don't Have To Memorize The Table

You have to know that a table *exists*, that parentheses always win, and that `typeof`, `await`, `new`, `??`, and `+` are the ones that surprise working programmers. When a line looks clever, it is usually a precedence bug wearing a costume.

## Boxed Booleans Lie In `if`

```js
var flag = new Boolean(false);

if (flag) {
    console.log("runs");     // it does
}

Boolean(flag);               // true  -- object is truthy
flag.valueOf();              // false -- the wrapped primitive
```

`new Boolean(false)` is an **object**. Objects are ToBoolean true (Chapter 4). Auto-boxing exists so `"kyle".length` works, not so you `new` wrappers. If you find `new String` / `new Number` / `new Boolean` in a codebase, it is almost always a bug wearing a constructor.

`document.all` is the other infamous ToBoolean special case (falsy object, web compat). Don't teach it as a tool. Recognize it if a host check looks possessed.

## Sparse Arrays Are Holes, Not `undefined` Slots

```js
var a = [];
a[0] = "Kyle";
a[2] = "Suzy";

a.length;                    // 3
a[1];                        // undefined
1 in a;                      // false -- hole
a.map(function(v){ return v; });
// [ "Kyle", <1 empty item>, "Suzy" ]  -- callback skipped the hole
```

`undefined` at an index is a value you put there. A hole is an index `length` claims that `in` denies. Many array methods skip holes; `forEach` skips; a `for` from `0` to `length - 1` does not. `Array.from` and spread densify. Don't mix the two models. Prefer `push` / literal lists over `a[i] =` with gaps.

`delete a[0]` on an array makes a hole. It does not reindex. `splice` is "remove this element."

## `valueOf` / `toString` / `Symbol.toPrimitive`

When an object meets an operator that wants a primitive (Chapter 4's ToPrimitive), JS asks the object, in an order that depends on a *hint* (`"number"`, `"string"`, `"default"`):

```js
var classroom = {
    ids: [ 73, 14 ],
    [Symbol.toPrimitive](hint) {
        if (hint == "string") return "classroom";
        return this.ids.length;
    }
};

String(classroom);           // "classroom"
classroom + 1;               // 3  -- default/number hint path
```

`Symbol.toPrimitive` if present wins. Otherwise `valueOf` / `toString` in hint order. This is how `Date` became a string in concatenation and a number in subtraction -- and why Temporal refused to be one object that does both. Don't implement `toPrimitive` on a DTO for cute `+` tricks. Do know why `${ obj }` called `toString`.

## `typeof` And The Host

`typeof null === "object"` is a bug that became web law. `typeof` a function is `"function"`. `typeof` an array is `"object"`. `typeof` a document.all in some browsers is `"undefined"` (another web-compat special). Feature detection with `typeof` is for *bindings* and some host objects, not for "is this an array" (`Array.isArray`) or "is this an error" (`Error.isError` where it exists).

## `==` Corner Pairs You Should Be Able To Name

Chapter 4 is the systematic treatment. This is the appendix flash card. Prefer `===` plus explicit coercions. If you *use* `==`, you should be able to say which abstract operations fire:

```js
"" == 0;                     // true  -- ToNumber("") is 0
"0" == 0;                    // true  -- ToNumber("0") is 0
"0" == false;                // true  -- ToNumber both sides-ish
null == undefined;           // true  -- spec exception
null == 0;                   // false -- not that exception
[] == "";                    // true  -- ToPrimitive([]) then ToString
[] == 0;                     // true  -- further ToNumber
[0] == 0;                    // true
[1] == true;                 // true  -- don't
```

I am not asking you to memorize the table. I am asking you to *stop being surprised*. If a test relies on `[] == false`, the test is documenting a coercion, not a classroom invariant. Write `arr.length === 0`.

## `NaN` And `-0` Are Values

```js
NaN === NaN;                 // false
Object.is(NaN,NaN);          // true
Number.isNaN(NaN);           // true
isNaN("foo");                // true  -- coerces first; trap

0 === -0;                    // true
Object.is(0,-0);             // false
```

`Object.is` is SameValue. `===` is SameValueX with `-0`/`0` collapsing and `NaN` unequal to itself. IEEE-754 is why. `1 / -0` is `-Infinity`. If you draw a chart and the sign of zero matters, `Object.is`. If you don't, `===` is fine and `-0` will almost never be your bug -- until it is, in a canvas or a wasm boundary.

## `parseInt` Is Not ToNumber

```js
parseInt("8px",10);          // 8
Number("8px");               // NaN
parseInt("08",10);           // 8
Number("");                  // 0
parseInt("",10);             // NaN
```

`Number(string)` / unary `+` are ToNumber of the whole string. `parseInt` tokenizes a prefix and ignores the rest (and needs a radix). Pick one on purpose. `parseInt(id)` on a student id `"73"` works; on `"73abc"` it *lies* that it worked. `Number("73abc")` refuses.

## `String(id)` vs Template Coercion

```js
String(73);                  // "73"
`${ 73 }`;                   // "73"
String(null);                // "null"
`${ null }`;                 // "null"
String(undefined);           // "undefined"
[73].toString();             // "73"
({}).toString();             // "[object Object]"
```

Templates ToString the hole. That's why putting an object in a template is the `toPrimitive` / `toString` path from earlier -- not JSON. If you meant JSON, call `JSON.stringify`. If you meant a label, write a function that returns a string on purpose.

`alert(student)` in a browser ToString's too. Don't debug objects that way.

## Comma Operator And `void`

```js
void fetchStudent(73);       // undefined; starts the work; drops the promise
(0, student.print)();        // call with this === undefined / global
```

`void` is "I meant to ignore this completion value." Fire-and-forget promises still need a `.catch` -- `void` does not swallow rejections. The comma operator evaluates left-to-right and returns the right. `(0, obj.method)()` is a `this`-stripping trick from *Objects & Classes*. Don't use it in classroom code. Do recognize it in a minified bundle.

## `+` Is Not Concatenation *Or* Addition -- It Is Both

```js
"73" + 1;                    // "731"
73 + "1";                    // "731"
73 + 1;                      // 74
[73] + 1;                    // "731" -- ToPrimitive the array
{} + 1;                      // "[object Object]1" or 1, depending on ASI / statement vs expr
```

Chapter 4 walks ToPrimitive / ToNumber / ToString for `+`. The appendix flash card is: **if either side is a string (after ToPrimitive), `+` concatenates.** Arrays primitive to strings. That's why `[73] + [14]` is `"7314"` and not a merge. Prefer `` `${ id }` `` or `Number(id)` when you know which you meant. Prefer `id + 1` only when both are already numbers you would defend.

`{}` at the start of a statement is a block, not an object -- `{} + 1` can be `+1`. Parenthesize `({} + 1)` if you meant the operator. That's Chapter 5 sitting in an appendix on purpose: types and grammar are one pillar.

## `Boolean(x)` vs `!!x` vs `if (x)`

All three ToBoolean. `!!x` is a coercion that produces an actual `true`/`false` value. `if (x)` ToBoolean's for control flow and doesn't give you a boolean you can return unless you write `!!`. `Boolean(x)` is the explicit function. Pick explicit when you *store* a flag. `if (x)` is fine when you mean "is this truthy" and you've already named what x is (a student object vs an id `0`).

`if (students.length)` is ToBoolean of a number -- `0` is skip. That's correct for "are there any." `if (port)` is the config bug from Appendix B. Same abstract operation, different question.

## `typeof` Table You Can Recite

```js
typeof undefined;            // "undefined"
typeof null;                 // "object"  -- bug / web law
typeof true;                 // "boolean"
typeof 1;                    // "number"
typeof 1n;                   // "bigint"
typeof "x";                  // "string"
typeof Symbol();             // "symbol"
typeof {};                   // "object"
typeof [];                   // "object"
typeof function(){};         // "function"
typeof /x/;                  // "object"
```

`typeof` is not "what constructor made this." Arrays, dates, regexps, maps are `"object"`. `Array.isArray`, `Error.isError`, `x instanceof Map` (careful across realms) are the follow-ups. Feature-detect *bindings* with `typeof foo == "undefined"`. Feature-detect *arrays* with `Array.isArray`. Don't `typeof x == "object"` and then treat it as a POJO -- `null` and arrays both lie to that check.

## `JSON.stringify` Drops `undefined`

```js
JSON.stringify({ a: 1, b: undefined, c: function(){} });
// '{"a":1}'
```

`undefined` and functions are omitted from objects (and become `null` in arrays). That's a types round-trip, not a JSON bug. `structuredClone` throws on functions instead of dropping them. Pick the clone that matches whether silent drop is acceptable. Classroom records with methods should not go through `JSON.stringify` and come back as the same *kind* of value.

## `NaN` From `Number("")`

`Number("")` is `0`. `Number(" ")` is `0`. `Number("x")` is `NaN`. Empty string ToNumber is a classic form-field bug: a blank input becomes port `0` if you `Number` it then `?? 80` -- `0` is not nullish. Validate with `Number.isFinite` after trim, or reject `""` as in Appendix B's `pickPort`.

## `document.all` Is Not A Tool

In some browsers `document.all` is a falsy object with a weird `typeof`. Web compatibility. Don't feature-detect with it. Don't teach it. If a host check looks possessed, you found a spec appendix, not a pattern.

## `switch` And `===`

`switch (x)` compares cases with `===`, not ToBoolean. `switch (student)` / `case 73:` will not match `case "73":`. `if (x)` ToBoolean's. That's Chapter 5. Don't "fix" a switch by making the discriminant truthy -- fix the types of the cases.

## `??` vs `||` One More Time

`0 ?? 80` is `0`. `0 || 80` is `80`. `"" ?? "x"` is `""`. `"" || "x"` is `"x"`. `null ?? 80` is `80`. Nullish is `null` and `undefined` only. Falsy is a longer list (Chapter 4). Grammar gave you `??` so you could stop lying with `||`.

If you remember only `??` vs `||`, `typeof null`, `+` concat, boxed `if`, holes vs `undefined`, and ASI `return`, you have the appendix. The rest is Chapter 4--5 at full length.

## Walk `pickPort` Until `0` Survives

```js
function pickPort(config) {
    var port = config.port;
    if (port === "") {
        throw new TypeError("port must be a number");
    }
    return port ?? 80;
}

pickPort({ port: 0 });       // 0
pickPort({ port: null });    // 80
pickPort({ port: "" });      // TypeError
```

`0 ?? 80` is `0` because `0` is not nullish. `0 || 80` is `80` because `0` is falsy. `"" ?? 80` is `""` -- that's why the exercise *throws* on `""` instead of defaulting: a string port is a type error, not a missing port. `Number("")` is `0`, which would then survive `??` and ship port 0 from a blank form. That's Appendix A's `Number("")` leftover sitting on top of Chapter 4's `??`.

Boxed `if (new Boolean(false))` enters because objects are truthy. Holes skip `map`'s callback; `undefined` slots do not. ASI `return` newline `{` is `return;` plus a block. `switch` uses `===`. `typeof null` is `"object"`. Six landmines. Name them when you step on them.

```js
var a = [];
a[0] = "Kyle";
a[2] = "Suzy";
a.map(function(v,i){
    console.log(i, v);
});
// 0 Kyle
// 2 Suzy
// no index 1 -- hole

[ "Kyle", undefined, "Suzy" ].map(function(v,i){
    console.log(i, v);
});
// 1 undefined  -- present slot
```

If you `new Array(3)` and `map` a fill-in, you get holes. `fill` first or use a literal. That's Chapter 3 wearing `map`.

`+` on `[73]` is concat because ToPrimitive of an array is `join`. `Number(73) + 1` is arithmetic. `==` with `null` is the one coercive check I still write on purpose (`x == null` for nullish). `==` with `80` is how `"80"` and `true` sneak in. Parenthesize. Name the abstract operation. Ugly-on-purpose is this book's grain the same way drawing scopes was Book 2's.

```js
var port = config.port;
if (port == null) {          // null or undefined -- on purpose
    port = 80;
}
else if (typeof port != "number") {
    throw new TypeError("port");
}
// 0 survives. "" throws. "80" throws.
```

That's `== null` as the *one* coercive check I still like, sitting next to `??`. Both refuse to treat `0` as missing. `||` does not.

WARNING:
`document.all` is a host compatibility fossil, not a pattern. If your feature detect looks possessed, you found a spec appendix, not a tool.

Back to Appendix B for practice. Then write some ugly, parenthesized, obvious code on purpose. That's the grain of this book.