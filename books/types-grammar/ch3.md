# You Don't Know JS Yet: Types & Grammar - 2nd Edition
# Chapter 3: Object Values

Now that we're comfortable with the built-in primitive types, we turn our attention to the `object` types in JS.

I could write a whole book talking about objects in-depth; in fact, I already did! The "Objects & Classes" title of this series covers objects in-depth already, so make sure you've read that before continuing with this chapter.

Rather than repeat that book's content, here we'll focus our attention on how the `object` value-type behaves and interacts with other values in JS.

## Types of Objects

The `object` value-type comprises several sub-types, each with specialized behaviors, including:

* plain objects
* fundamental objects (boxed primitives)
* built-in objects
* arrays
* regular expressions
* functions (aka, "callable objects")

Beyond the specialized behaviors, one shared characteristic is that all objects can act as collections (of properties) holding values (including functions/methods).

## Plain Objects

The general object value-type is sometimes referred to as *plain ol' javascript objects* (POJOs).

Plain objects have a literal form:

```js
address = {
    street: "12345 Market St",
    city: "San Francisco",
    state: "CA",
    zip: "94114"
};
```

This plain object (POJO), as defined with the `{ .. }` curly braces, is a collection of named properties (`street`, `city`, `state`, and `zip`). Properties can hold any values, primitives or other objects (including arrays, functions, etc).

The same object could also have been defined imperatively using the `new Object()` constructor:

```js
address = new Object();
address.street = "12345 Market St";
address.city = "San Francisco";
address.state = "CA";
address.zip = "94114";
```

Plain objects are by default `[[Prototype]]` linked to `Object.prototype`, giving them delegated access to several general object methods, such as:

* `toString()` / `toLocaleString()`
* `valueOf()`
* `isPrototypeOf(..)`
* `hasOwnProperty(..)` (recently deprecated -- alternative: static `Object.hasOwn(..)` utility)
* `propertyIsEnumerable(..)`
* `__proto__` (getter function)

```js
address.isPrototypeOf(Object.prototype);    // true
address.isPrototypeOf({});                  // false
```

## Fundamental Objects

JS defines several *fundamental* object types[^FundamentalObjects], which are instances of various built-in constructors, including:

* `new String()`
* `new Number()`
* `new Boolean()`

Note that these constructors must be used with the `new` keyword to construct instances of the fundamental objects. Otherwise, these functions actually perform type coercion (see Chapter 4).

These fundamental object constructors create object value-types instead of a primitives:

```js
myName = "Kyle";
typeof myName;                      // "string"

myNickname = new String("getify");
typeof myNickname;                  // "object"
```

In other words, an instance of a fundamental object constructor can actually be seen as a wrapper around the corresponding underlying primitive value.

| WARNING: |
| :--- |
| It's nearly universally regarded as *bad practice* to ever directly instantiate these fundamental objects. The primitive counterparts are generally more predictable, more performant, and offer *auto-boxing* (see "Automatic Objects" section below) whenever the underlying object-wrapper form is needed for property/method access. |

The `Symbol(..)` and `BigInt(..)` functions are referred to in the specification as "constructors", though they're not used with the `new` keyword, and the values they produce in a JS program are indeed primitives.

However, there are internal *fundamental objects* for these two types, used for prototype delegation and *auto-boxing*.

By contrast, for `null` and `undefined` primitive values, there aren't `Null()` or `Undefined()` "constructors", nor corresponding fundamental objects or prototypes.

### Prototypes

Instances of the fundamental object constructors are `[[Prototype]]` linked to their constructors' `prototype` objects:

* `String.prototype`: defines `length` property, as well as string-specific methods, like `toUpperCase()`, etc.

* `Number.prototype`: defines number-specific methods, like `toPrecision(..)`, `toFixed(..)`, etc.

* `Boolean.prototype`: defines default `toString()` and `valueOf()` methods.

* `Symbol.prototype`: defines `description` (getter), as well as default `toString()` and `valueOf()` methods.

* `BigInt.prototype`: defines default `toString()`, `toLocaleString()`, and `valueOf()` methods.

Any direct instance of the built-in constructors have `[[Prototype]]` delegated access to its respective `prototype` properties/methods. Moreover, corresponding primitive values also have such delegated access, by way of *auto-boxing*.

### Automatic Objects

I've mentioned *auto-boxing* several times (including Chapters 1 and 2, and a few times so far in this chapter). It's finally time for us to explain that concept.

Accessing a property or method on a value requires that the value be an object. As we've already seen in Chapter 1, primitives *are not* objects, so JS needs to then temporarily convert/wrap such a primitive to its fundamental object counterpart[^AutoBoxing] to perform that access.

For example:

```js
myName = "Kyle";

myName.length;              // 4

myName.toUpperCase();       // "KYLE"
```

Accessing the `length` property or the `toUpperCase()` method, is only allowed on a primitive string value because JS *auto-boxes* the primitive `string` into a wrapper fundamental object, an instance of `new String(..)`. Otherwise, all such accesses would have to fail, since primitives do not have any properties.

More importantly, when the primitive value is *auto-boxed* to its fundamental object counterpart, those internally created objects have access to predefined properties/methods (like `length` and `toUpperCase()`) via a `[[Prototype]]` link to their respective fundamental object's prototype.

So an *auto-boxed* `string` is an instance of `new String()`, and is thus linked to `String.prototype`. Further, the same is true of `number` (wrapped as an instance of `new Number()`) and `boolean` (wrapped as an instance of `new Boolean()`).

Even though the `Symbol(..)` and `BigInt(..)` "constructors" (used without `new`) produce primitive values, these primitive values can also be *auto-boxed* to their internal fundamental object wrapper forms, for the purposes of delegated access to properties/methods.

| NOTE: |
| :--- |
| See the "Objects & Classes" book of this series for more on `[[Prototype]]` linkages and delegated/inherited access to the fundamental object constructors' prototype objects. |

Since `null` and `undefined` have no corresponding fundamental objects, there is no *auto-boxing* of these values.

A subjective question to consider: is *auto-boxing* a form of coercion? I say it is, though some disagree. Internally, a primitive is converted to an object, meaning a change in value-type has occurred. Yes, it's temporary, but plenty of coercions are temporary. Moreover, the conversion is rather *implicit* (implied by the property/method access, but only happens internally). We'll revisit the nature of coercion in Chapter 4.

### See The Box

`"Kyle".toUpperCase()` looks like a method on a primitive. It isn't. Watch the steps:

1. Evaluate `"Kyle"` -- a primitive string.
2. Property access `.toUpperCase` requires an object. The engine ToObject's the string: a temporary `String` instance, `[[Prototype]]`-linked to `String.prototype`.
3. `toUpperCase` is found on that prototype (or further up). It is called with `this` bound to the wrapper (implementations may optimize the wrapper away as long as you can't tell).
4. The method reads the primitive string out of the wrapper, builds `"KYLE"`, returns it.
5. The wrapper is thrown away. You cannot stash it. `("Kyle").foo = 1` **throws** `TypeError` in strict mode (this series assumes strict). In sloppy mode the assignment appears to succeed and still doesn't persist: `("Kyle").foo` is `undefined` -- each access boxes again.

There is no object to keep. `new String("Kyle")` *is* an object you can stash -- and then `typeof` is `"object"`, `==` vs `"Kyle"` may coerce, and you've invented a second kind of string. Don't.

```js
var boxed = new Boolean(false);

if (boxed) {
    // runs -- ToBoolean of an object is true
}

if (boxed.valueOf()) {
    // does not run -- the primitive is false
}
```

The wrapper is the value you asked for. `if (boxed)` asked ToBoolean of *that object*. Chapter 4 will systematize this. Here, just: **never `new` the fundamental wrappers.** Auto-boxing is the language being helpful. `new Boolean` is you being unhelpful.

## Other Built-in Objects

In addition to fundamental object constructors, JS defines a number of other built-in constructors that create further specialized object sub-types:

* `new Date(..)` -- still in the language; for new code, prefer `Temporal` (see *ES.Next & Beyond*, Chapter 4)
* `new Error(..)`
* `new Map(..)`, `new Set(..)`, `new WeakMap(..)`, `new WeakSet(..)` -- keyed collections
* `new Int8Array(..)`, `new Uint32Array(..)`, etc -- indexed, typed-array collections
* `new ArrayBuffer(..)`, `new SharedArrayBuffer(..)`, etc -- structured data collections

## Arrays

Arrays are objects that are specialized to behave as numerically indexed collections of values, as opposed to holding values at named properties like plain objects do.

Arrays have a literal form:

```js
favoriteNumbers = [ 3, 12, 42 ];

favoriteNumbers[2];                 // 42
```

The same array could also have been defined imperatively using the `new Array()` constructor:

```js
favoriteNumbers = new Array();
favoriteNumbers[0] = 3;
favoriteNumbers[1] = 12;
favoriteNumbers[2] = 42;
```

Arrays are `[[Prototype]]` linked to `Array.prototype`, giving them delegated access to a variety of array-oriented methods, such as `map(..)`, `includes(..)`, etc:

```js
favoriteNumbers.map(v => v * 2);
// [ 6, 24, 84 ]

favoriteNumbers.includes(42);       // true
```

Some of the methods defined on `Array.prototype` -- for example, `push(..)`, `pop(..)`, `sort(..)`, etc -- behave by modifying the array value in place. Other methods -- for example, `concat(..)`, `map(..)`, `slice(..)` -- behave by creating a new array to return, leaving the original array intact. A third category of array functions -- for example, `indexOf(..)`, `includes(..)`, etc -- merely computes and returns a (non-array) result.

| NOTE: |
| :--- |
| Arrays are objects, so they can *also* have named properties (`favoriteNumbers.owner = "Kyle"`). Don't. An array's job is to be an ordered, numerically indexed collection. Named properties on arrays confuse readers, skip most array iteration mechanisms, and are a sign you've wanted a plain object (or a `Map`) all along. |

### Holes Are Not `undefined`

```js
var classroom = [];
classroom[0] = "Kyle";
classroom[2] = "Suzy";

classroom.length;            // 3
classroom[1];                // undefined
1 in classroom;              // false
classroom.hasOwnProperty(1); // false

var filled = [ "Kyle", undefined, "Suzy" ];
1 in filled;                 // true
```

`classroom[1]` is a **hole**. `filled[1]` is a value, `undefined`. `map` / `forEach` / `filter` skip holes and visit `undefined`. `for (var i = 0; i < classroom.length; i++)` visits the hole and reads `undefined`. Spread and `Array.from` typically densify holes into `undefined` slots.

Empty slots from `new Array(3)` are holes, not three `undefined`s. If you meant three placeholders, write `[ undefined, undefined, undefined ]` or `fill`. If you meant a list, `push`.

This is a *types* fact that looks like an array-API fact: the value at a hole isn't `undefined` until you read it through an operation that synthesizes `undefined`. `in` tells the truth.

## Regular Expressions

Regular expressions are objects that represent a pattern to be matched against strings. They have a literal form, delimited by `/`:

```js
emailPattern = /[^@]+@[^@]+\.[^@]+/;

emailPattern.test("kyle@getify.com");     // true
emailPattern.test("not-an-email");        // false
```

The same pattern can be constructed with `new RegExp(..)`, which is useful when the pattern isn't known until runtime:

```js
domain = "getify.com";
emailPattern = new RegExp(
    `[^@]+@${ domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }`
);
```

| WARNING: |
| :--- |
| If you build a `RegExp` from a string, `\\` in the string becomes `\` in the pattern -- you have to double-escape. A `.` in `getify.com` is "any character" unless you escape it. Literal `/../` form does not have that extra layer. Prefer the literal unless the pattern is actually computed. |

A regexp object is `[[Prototype]]`-linked to `RegExp.prototype`, which defines methods such as `test(..)`, `exec(..)`, and (via well-known symbols) the hooks that let a regexp participate in `String` methods like `match(..)`, `replace(..)`, `search(..)`, and `split(..)`.

```js
msg = "Your favorite number is 42, right?";

msg.match(/\d+/);            // [ "42" ]
msg.replace(/\d+/,"n");      // "Your favorite number is n, right?"
```

### Flags

A regexp can be modified by flags, specified after the closing `/` (or as the second argument to `new RegExp(..)`):

* `g` -- global: find all matches, not just the first
* `i` -- case-insensitive
* `m` -- multiline: `^` / `$` match at line breaks
* `s` -- "dotAll": `.` matches newline as well
* `u` -- unicode: treat the pattern as Unicode code points / enable `\p{..}`
* `y` -- sticky: match only at `lastIndex`
* `d` -- indices: include start/end positions of matches
* `v` -- unicode sets (ES2024): more expressive character classes

```js
/\d+/g.flags;                // "g"
/foo/i.test("FOO");          // true
```

The `g` and `y` flags make a regexp *stateful*: they update the `lastIndex` property on the regexp object as matching proceeds. That means regexp objects used with those flags are not safe to share across unrelated matching operations without resetting `lastIndex`. This is one of several reasons I treat regexps as values you create, use, and often throw away -- not as long-lived shared singletons.

### Capturing

Parentheses in a pattern capture substrings. `exec(..)` and `match(..)` (without `g`) return an array-like result with the full match at index `0` and captures at `1`, `2`, .. Named captures (`(?<name>..)`) also appear on a `.groups` object:

```js
pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
result = pattern.exec("2022-07-04");

result[0];                   // "2022-07-04"
result.groups.year;          // "2022"
```

With the `g` flag, `String.prototype.match(..)` drops captures and returns only the full matches. `matchAll(..)` (or a `while` loop over `exec(..)`) is the way to get all matches *and* their captures.

I won't attempt a complete regular-expression tutorial here -- that could be its own book. The point for *this* book is: a regexp is an object value-type with specialized matching behavior, not a primitive, and not "just a string." `typeof /foo/` is `"object"`. Two regexps that look identical are not `===` equal, because objects compare by identity:

```js
/foo/ === /foo/;             // false
```

## Functions

Functions in JS are objects. That's not a metaphor, and it's not "under the covers." You can hang properties on them, pass them as values, return them from other functions, and `[[Prototype]]`-link them (they link to `Function.prototype` by default).

```js
function greet(name) {
    return `Hello, ${ name }`;
}

typeof greet;                // "function"
greet instanceof Function;   // true

greet.dialect = "en-US";
greet.dialect;               // "en-US"
```

`typeof` returning `"function"` instead of `"object"` is a historical courtesy, not evidence that functions aren't objects. They are. They're objects that are *callable*.

The *Types & Grammar* concern here is not how scope and closure work -- that's Book 2 -- nor how `this` is bound -- that's Book 3. It's what kind of *value* a function is, and how that value behaves among other values.

### Callable Objects

Because functions are objects, the value-type `function` is a subtype of `object`. That's why `typeof greet` is the odd one out in the `typeof` table (Chapter 1), and why `Function.prototype` is itself a function (it's callable!) that is `[[Prototype]]`-linked to `Object.prototype`.

```js
Object.getPrototypeOf(Function.prototype) === Object.prototype;
// true

typeof Function.prototype;   // "function"
Function.prototype();        // undefined  (it's a no-op function)
```

You can also create functions with `new Function(..)`, analogous to `new Function("a","b","return a + b")`. This form is an `eval(..)`-cousin: the body is a string compiled at runtime. Avoid it unless you truly need to compile code from a string.

### Length, Name, And Other Properties

Functions have a few built-in properties that show up in meta-programming (see *Objects & Classes*, Chapter 2):

```js
function help(opt1,opt2,...rest) {
    // ..
}

help.name;                   // "help"
help.length;                 // 2
```

`length` counts declared parameters up to (but not including) the first one with a default value, or a rest parameter. Arrow functions, method shorthands, and `class` constructors all still produce function objects, with the same kind of properties -- though `class` constructors throw if you call them without `new`, and some of these functions are not constructable at all (arrows, methods, concise generators in some forms).

I strongly recommend **not** assigning your own properties onto function objects as a data store. Use a `Map` / `WeakMap` keyed by the function instead. Functions-as-objects is a fact of the value-type; functions-as-dumping-ground is a readability trap.

### Multiple Function Forms

JS has a lot of ways to spell a function. They do not all produce the same kind of function-value:

* `function foo() {}` -- a function declaration; hoisted; constructable; has `this`; has `prototype`
* `var foo = function() {}` -- a function expression; not hoisted as a declaration; otherwise similar
* `var foo = function bar() {}` -- a *named* function expression; `bar` is in-scope only inside the function
* `() => {}` -- an arrow function; *not* constructable; *lexical* `this` (and `arguments`, `super`, `new.target`); no `prototype`
* `({ foo() {} })` -- a concise method; not constructable; can use `super` if in a `class` / object with `[[HomeObject]]`
* `function* foo() {}` / `async function foo() {}` / `async function* foo() {}` -- generator / async / async-generator variants; different callable protocol (iterators, promises)
* `class Foo {}` -- the constructor is a function, but it is not a "plain" `typeof "function"` you should call without `new`

These distinctions matter when you coerce or inspect values. `new (() => {})` throws. `foo.prototype` is `undefined` on an arrow. `foo.toString()` returns source text that may or may not match what you authored (engines are allowed to standardize whitespace in `Function.prototype.toString()`).

From a types perspective: **treat "function" as one `typeof` result that hides several subtypes.** When you're about to `new` a value, or read `.prototype`, or depend on `this`, check which form you actually have.

We'll come back to generators and `async function` as *control-flow* mechanisms in *Sync & Async*. Here, just register them as more function objects, with more specialized call behaviors.

## Composites (The Records/Tuples Story)

At the time the first draft of this chapter was written, a stage-2 proposal existed to add *records* and *tuples* -- immutable, primitive-like cousins of plain objects and arrays, spelled `#{ .. }` and `#[ .. ]`, compared with `===` by contents, and usable as `Map` keys.

That proposal was **withdrawn by TC39 in April 2025**[^RecordsTuplesProposal]. The committee could not reach consensus on adding new primitive types (and a new equality story) to the language. This is worth sitting with: a feature can look inevitable for years and still not ship. "Stage 2" is not a promise.

What replaced the *motivation* -- "I want a structured value I can put in a `Set` / `Map` and compare by contents" -- is still being explored, currently under the name **Composites**[^CompositesProposal] (stage 1 at the time of this writing). Composites, as currently sketched, are *objects*, not primitives: shallowly immutable, with a defined equality, aimed at being collection keys. The syntax, equality algorithm, and even whether they intern (so that `===` works by identity of a canonical instance) have already shifted while the proposal has been alive.

```js
// proposed sketch -- NOT JS (yet), and likely to change:
// pair = Composite({ x: 1, y: 2 });
// Composite.equal(pair, Composite({ y: 2, x: 1 }));  // true
```

I am **not** teaching you to write that code. I'm teaching you to read proposal tea leaves with the right amount of salt. The types-and-values lesson is:

* JS currently has **no** immutable primitive product type. Objects and arrays are mutable and compared by identity. That's the language you must design in *today*.
* If you need value-equality keys now, you typically serialize to a string key, or use a custom comparator structure, or intern objects yourself.
* Features that would change the *value-type* story (new primitives, new `typeof` results, new equality) are the ones that face the steepest climb through TC39 -- because they don't just add an API, they change what a "value" *is*.

Don't write your programs as if `#{ .. }` is coming next Tuesday. Do remember that the *need* hasn't gone away, which is why a successor proposal exists at all.

We've now surveyed the object value-types -- plain objects, boxed primitives, arrays, regexps, functions -- and how they sit beside primitives. In Chapter 4, we turn to the operations that convert values from one type to another: coercion.

[^FundamentalObjects]: "20 Fundamental Objects", ECMAScript 2022 Language Specification; https://262.ecma-international.org/13.0/#sec-fundamental-objects ; Accessed August 2022

[^AutoBoxing]: "6.2.4.6 PutValue(V,W)", Step 5.a, ECMAScript 2022 Language Specification; https://262.ecma-international.org/13.0/#sec-putvalue ; Accessed August 2022

[^RecordsTuplesProposal]: "JavaScript Records & Tuples Proposal" (withdrawn April 2025); Robin Ricard, Rick Button, Nicolò Ribaudo; https://github.com/tc39/proposal-record-tuple ; Accessed August 2026

[^CompositesProposal]: "Composites"; Ashley Claymore; https://github.com/tc39/proposal-composites ; Accessed August 2026
