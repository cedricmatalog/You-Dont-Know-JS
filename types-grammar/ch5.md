# You Don't Know JS Yet: Types & Grammar - 2nd Edition
# Chapter 5: Grammar

The last four chapters were about *values*: what they are, how they behave, how they convert. That's the type system. But a type system with no grammar is a pile of parts on the workbench. Grammar is how we assemble those parts into a program the engine will actually parse and run.

JS's grammar is where a lot of "JS is so weird" folklore is born. Automatic semicolon insertion, the difference between a statement and an expression, operator precedence that doesn't match how people *say* the code out loud -- these aren't type bugs. They're grammar. And like the rest of this series, the cure is not to avoid the grammar. It's to know it.

## Statements And Expressions

A JS program is a list of *statements*. Statements do things: declare a binding, complete a loop iteration, throw an exception, return from a function. Many statements *contain* expressions. Expressions produce values.

```js
var favoriteNumber = 3 + 39;
```

`var favoriteNumber = ..` is a statement (a declaration). `3 + 39` is an expression. The expression produces `42`; the statement binds that value to the name `favoriteNumber`.

This distinction is not academic. It's why some things are legal in some places and syntax errors in others:

```js
// expression context -- fine
foo(3 + 39);

// statement context -- also fine
3 + 39;

// not an expression -- SyntaxError if you try to use it as one
foo(if (true) { 42 });
```

`if` is a statement. It is not an expression. You cannot pass it as an argument, assign it, or return it. `3 + 39` *is* an expression, so you can do all of those things with it -- including, as shown, sit it on a line by itself as an *expression statement*.

| NOTE: |
| :--- |
| An expression sitting where a statement is expected is an *expression statement*. That's why `3 + 39;` is a legal program: the grammar wraps the expression in a statement. The value is computed and then thrown away, unless something else captures it. |

### Completion Values

Every statement has a *completion value*. You rarely see it, because most of the time nothing observes it. But it is there, and it leaks out in a few surprising places -- most famously, `eval(..)` (please don't) and the browser console, which prints the completion value of whatever you just ran.

```js
if (true) {
    42;
}
// completion value: 42
```

Blocks, `if`, `while`, `try`, and friends take on the completion value of their last inner statement. That's why a bare `42` at the end of a block "is" `42` as far as the console is concerned.

`var` / `function` / `class` declarations complete with `undefined`. `break`, `continue`, `return`, and `throw` have their own completion records (that's how they unwind). You don't need to memorize the completion-record spec algorithm. You *do* need to know that statements produce something, even when they don't look like expressions.

### Expression-ish Statements

A handful of syntactic forms look like they might be either, depending on where they appear.

**`{ }`**. At the start of a statement, `{` begins a *block*. In an expression, `{` begins an *object literal*. This is the source of the classic ASI / arrow / JSON confusion:

```js
{ foo: 42 }          // a block, with a labeled statement `foo`
({ foo: 42 })        // an object
```

**`function`**. At the start of a statement, `function foo() {}` is a *function declaration*. Anywhere an expression is expected, `function() {}` (or `function foo() {}`) is a *function expression*.

**`class`**. Same split: `class Foo {}` as a statement is a class declaration; `class {}` / `class Foo {}` as an expression is a class expression.

**`[ ]`**. This one is less of a statement/expression split and more of an operator split: at the start of a statement, `[` could be the start of an array literal *or* (in sloppy ASI situations) the end of the previous statement getting indexed. More on that under ASI.

Once you see these ambiguities, a lot of "why do I need parentheses here?" questions answer themselves: you're forcing the parser to treat a `{` or `function` as an expression.

## Operator Precedence

When an expression has more than one operator, *precedence* decides which operation happens first -- not left-to-right reading order, and not "the order I'd say it in English."

```js
3 + 4 * 5;           // 23, not 35
```

`*` binds tighter than `+`, so this is `3 + (4 * 5)`. Everyone remembers that one from grade-school math. JS has many more operators, and the pairwise rankings are not all obvious.

```js
typeof 3 + 4;        // "number4"   --  (typeof 3) + 4
typeof (3 + 4);      // "number"

3 && 4 || 5;         // 4           --  (3 && 4) || 5
3 || 4 && 5;         // 3           --  3 || (4 && 5)
```

Yes: `&&` binds tighter than `||`. `typeof` binds tighter than `+`. `new` binds tighter than property access in some forms and looser in others (`new Foo.bar()` vs `new Foo().bar()`).

I am not going to print the entire precedence table here; the specification and MDN both have one, and the table is the authority. What I *will* do is give you the rules of survival:

1. **When you are unsure, parenthesize.** Parentheses are not a moral failure. They are documentation of intent for the next reader (including you).
2. **Don't stack operators of similar-but-not-equal precedence on one line without parens.** `??` vs `||` vs `&&` vs `?:` is a minefield. In fact, mixing `??` with `&&` or `||` *without* parentheses is a **syntax error** -- TC39 put up a fence because the precedence was so easy to get wrong.
3. **Unary operators bind tight.** `typeof`, `delete`, `await`, `void`, `++`, `!`, `new` (without arguments)... they grab the thing immediately next to them.
4. **Assignment is very loose.** `x = y = 42` works because assignment is right-associative and low-precedence. `x = 3 + 4` is obviously `x = (3 + 4)`, not `(x = 3) + 4`.
5. **The comma operator is the loosest.** `(x, y)` as an expression evaluates `x`, throws that value away, and yields `y`. Function argument lists and array literals use commas too, but those commas are *not* the comma operator. More confusion, more need for parens in the rare case you actually want the operator.

```js
a = 42, b = 3;               // comma *statements* / expression-statement
foo( (a, b) );               // comma *operator*: calls foo(b)
foo( a, b );                 // two arguments
```

### Associativity

When two operators have the *same* precedence, *associativity* decides grouping. Most binary operators are left-associative:

```js
3 - 4 - 5;                   // (3 - 4) - 5  == -6
```

Assignment, exponentiation (`**`), and the conditional (`? :`) are right-associative:

```js
a = b = c = 42;              // a = (b = (c = 42))

2 ** 3 ** 2;                 // 2 ** (3 ** 2) == 512, not 64
```

`**` being right-associative matches mathematics (`2^3^2` is `2^(3^2)`). It also means ` -2 ** 2` is a **syntax error**: the parser refuses to guess whether you meant `(-2) ** 2` or `-(2 ** 2)`. Parenthesize.

### Short Circuit

`&&`, `||`, and `??` do not always evaluate both sides. That's *short-circuit evaluation*, and it's grammar + runtime together:

```js
function left()  { console.log("left");  return false; }
function right() { console.log("right"); return true;  }

left() && right();
// left
// (right() is never called)
```

`||` stops at the first truthy value. `&&` stops at the first falsy value. `??` stops at the first value that is not `null`/`undefined`. The skipped operand is not "converted" to anything. It is **not evaluated**. Side effects in the skipped operand do not happen.

This is why `x && x.foo()` and `x?.foo()` both exist (and are not quite the same thing -- see "Optional Chains" later). It's also why you must not put necessary side effects on the right-hand side of a short-circuit expression unless you truly mean "only if the left side lets us get there."

The conditional operator `? :` is also short-circuiting: only one of the two branches runs.

## Automatic Semicolon Insertion

JS's grammar, on paper, wants semicolons between statements. JS's *authoring culture* often omits them. The compiler fills them in using a set of rules called Automatic Semicolon Insertion (ASI).[^ASI]

ASI is not "the parser guesses where you wanted a semicolon." It is a small, deterministic procedure that runs when the parser hits a syntax error, or a newline in a forbidden place, and asks: would inserting a `;` here make this parse?

The rules, slightly simplified:

1. If the next token is `}` (end of a block), a semicolon is inserted.
2. If the parser hits the end of the input, a semicolon is inserted.
3. If the parser sees a newline where the grammar forbids a newline (a "restricted production"), a semicolon is inserted.
4. Otherwise, if the next token cannot continue the current statement, a semicolon is inserted -- *except* ASI will never insert a semicolon as an empty statement, and never insert one to make a `for` header parse.

Restricted productions -- the ones where a newline *forcibly* ends a statement -- include `return`, `throw`, `break`, `continue`, `yield`, and postfix `++` / `--`:

```js
return
  42;
// ASI makes this: return; 42;
// The function returns undefined. 42 is a separate (useless) statement.
```

This is the most famous ASI footgun. Always put the returned expression on the same line as `return`. The same applies to `yield` and `throw`.

The *other* famous footgun is a line starting with `(`, `[`, `` ` ``, `+`, `-`, or `/` after a statement that *could* have continued:

```js
a = b
[ c ].forEach(fn);
```

The parser sees `b[c].forEach(fn)` -- a property access on `b` -- not two statements. If you meant two statements, you needed a semicolon after `b`.

```js
a = b;
[ c ].forEach(fn);           // now it's two statements
```

| NOTE: |
| :--- |
| This is the actual, technical argument for "always use semicolons." Not aesthetics. ASI is predictable *if you know the rules*, and one of those rules is that a `[` or `(` on the next line may continue the previous statement. Teams that omit semicolons typically adopt a lint rule requiring a leading `;` before those tokens -- which is just putting the semicolon in a weirder place. |

I use semicolons in this series. I think you should too. Not because ASI is broken -- it isn't -- but because making the statement boundary *visible* is cheaper than making every reader re-run the ASI algorithm.

### ASI And `class` Fields

Chapter 3 of *Objects & Classes* already showed a modern ASI trap: a class field without a semicolon, followed by a computed method or field:

```js
class Point {
    x = 3
    [Symbol.toStringTag] = "Point"
}
```

Depending on the next token, ASI may or may not save you. The `= 3` field *does* get a semicolon inserted before `[` in current JS (fields are restricted in a way that helps here), but adjacent method/field forms have produced real parse bugs and real style-guide fights. Don't be clever: put the semicolon on the field.

## Errors

JS distinguishes *parse-time* (early) errors from *run-time* errors.

A **syntax error** (`SyntaxError`) means the grammar rejected the program. The code does not run. Not even the line before the mistake. The whole script (or module) fails to parse.

An **early error** is a syntax-adjacent error the spec calls out even when the tokens would otherwise parse: using `let` as a binding name in strict mode, a duplicate `__proto__` in an object literal, `super` outside a method, a `continue` that's not in a loop, etc. These also prevent the program from running.

A **runtime error** (`TypeError`, `ReferenceError`, `RangeError`, ..) happens while code is executing. Code *before* the throw has already run.

```js
console.log("this runs");
foo.bar();                   // TypeError if foo is null
console.log("this does not");
```

vs:

```js
console.log("this does not run either");
function {                   // SyntaxError
```

That difference matters for how you debug, and for how you structure `try..catch`. You cannot `try..catch` a syntax error in the same file -- the file never started. You *can* `try..catch` a `SyntaxError` thrown by `eval(..)` or `new Function(..)`, because those parse a *different* program at runtime. That's not a recommendation to use them.

### `try..catch..finally`

```js
try {
    mightThrow();
}
catch (err) {
    recover(err);
}
finally {
    cleanup();
}
```

`catch` binds the thrown value (any value -- JS lets you `throw 42`, though you should throw `Error` instances). As of ES2019, `catch` may omit the binding: `catch { .. }` when you don't need the error object.

`finally` **always** runs if `try` was entered -- whether the `try` completed normally, threw, `return`ed, `break`ed, or `continue`d. That's the whole point.

And that's also the footgun:

```js
function lookup(key) {
    try {
        return readCache(key);
    }
    finally {
        return defaultValue;     // oops
    }
}
```

A `return` (or `throw`) in `finally` **replaces** the completion of `try`/`catch`. The `return readCache(key)` happens, then `finally` runs, then `return defaultValue` wins. The cached value is thrown away. The same is true of a `throw` in `finally` swallowing the original error.

| WARNING: |
| :--- |
| Do not `return` or `throw` from `finally` unless you are *deliberately* overriding the `try`/`catch` completion. Cleanup belongs in `finally`. Decisions about what the function *yields* belong in `try`/`catch`. |

`try` can appear without `catch` if `finally` is present, and vice versa. `try` without either is a syntax error.

### `throw`

`throw` is a statement. Its operand is an expression. ASI applies (`throw` is a restricted production), so:

```js
throw
  new Error("nope");
// SyntaxError -- ASI inserts `throw;` which is illegal
```

Throw `Error` (or a subclass: `TypeError`, your own `class ValidationError extends Error`). Throwing strings or objects without a stack makes debugging harder for everyone who catches them later -- including you.

## `switch`

`switch` is a statement whose grammar surprises people coming from C-like languages *and* people who assume it's just `if..else if` with different clothes.

```js
switch (favoriteNumber) {
    case 3:
        console.log("small");
        break;
    case 42:
        console.log("the answer");
        break;
    default:
        console.log("other");
}
```

The `switch` expression is evaluated once. Then each `case` expression is evaluated, in source order, and compared to the switch value with **`===`** (strict equality). Not `==`. There is no coercion at the `case` comparison. If you need coercion, do it to the switch operand yourself, or don't use `switch`.

`case` expressions are not limited to literals. They can be any expression: function calls, property accesses, computed values. They are evaluated only if no prior case has matched (and fallen through without `break`), as the engine walks down looking for a match.

**Fall-through** is real. Without `break` (or `return`, or `throw`), execution continues into the next `case` *body*, even if that `case`'s label wouldn't have matched:

```js
switch (x) {
    case 1:
    case 2:
        console.log("one or two");
        break;
    case 3:
        console.log("three, and...");
        // missing break
    default:
        console.log("...maybe more");
}
```

Fall-through is occasionally elegant (the `case 1: case 2:` grouping). It is far more often a bug. If you use it, comment it. If you don't need it, `break` every case.

`default` may appear anywhere in the list; it runs if no `case` matched, and it *also* falls through into whatever follows it. Putting `default` last is a convention because it makes fall-through obvious.

Here's the coercion connection from Chapter 4, because `switch` is where people mix pillars without noticing:

```js
var favoriteNumber = "42";

switch (favoriteNumber) {
    case 42:
        console.log("number forty-two");
        break;
    case "42":
        console.log("string forty-two");
        break;
}

if (favoriteNumber) {
    console.log("truthy");
}
```

```
string forty-two
truthy
```

`switch` uses `===`, so `"42"` does not match `42`. `if (favoriteNumber)` uses ToBoolean, so a non-empty string is truthy. Same value, two productions, two type stories. If you wanted `switch` to coerce, coerce the operand *once* yourself (`switch (Number(favoriteNumber))`) so the reader can see it. Don't wish `case` used `==`.

## Function Parameter Grammar

Function parameter lists are a mini-grammar of their own.

```js
function help(
    first,                   // simple parameter
    second = 42,             // default
    { name, age },           // destructured object
    ...rest                  // rest (must be last)
) {
    // ..
}
```

**Defaults** are evaluated *at call time*, only if the argument is `undefined` (not if it's missing-but-not-undefined in some other way -- passing `undefined` *is* the "fill in the default" signal). The default expression can see earlier parameters, but not later ones:

```js
function offset(x, y = x + 1) {
    return [ x, y ];
}

offset(3);                   // [ 3, 4 ]
offset(3, undefined);        // [ 3, 4 ]
offset(3, 0);                // [ 3, 0 ]
```

**Rest** gathers remaining arguments into a real array. There can be only one, and it must be last. It is not the same as the `arguments` object: `arguments` is array-*like*, is inherited from sloppy-mode JS, and (in non-strict, non-default, non-rest, non-destructured functions) has the bizarre "mapped parameters" live-link behavior. Don't use `arguments` in new code. Use rest.

**Destructuring** in a parameter list is the same grammar as destructuring in an assignment (next section). Combined with defaults, you get the common "options object" pattern:

```js
function connect({ host = "localhost", port = 80 } = {}) {
    // ..
}

connect();                   // host=localhost, port=80
connect({ port: 443 });      // host=localhost, port=443
```

The `= {}` after the destructuring pattern is the default for the *whole argument*: if nothing (or `undefined`) is passed, destructure `{}`, which then fills `host` and `port` from *their* defaults. Without `= {}`, `connect()` would throw while trying to destructure `undefined`.

## Destructuring

Destructuring is grammar for pulling values out of objects and arrays (and iterables) at the binding/assignment site.

```js
{ a, b } = { a: 1, b: 2, c: 3 };

a;                           // 1
b;                           // 2
```

Wait -- that first line is a syntax error if it appears as a statement! `{ a, b } = ..` at the start of a line is parsed as a **block**, not as a destructuring assignment. Same statement/expression ambiguity as before. Wrap it:

```js
({ a, b } = { a: 1, b: 2, c: 3 });
```

Or, better, declare while you destructure:

```js
var { a, b } = { a: 1, b: 2, c: 3 };
var [ first, second ] = [ 10, 20, 30 ];
```

Object destructuring matches by **property name**, not position. Array destructuring matches by **iteration order** (it uses the iterable protocol, so it works on any iterable, not just arrays).

You can nest, rename, default, and rest:

```js
var {
    loc: { city, state },
    name: displayName = "anonymous",
    ...other
} = person;

var [ head, ...tail ] = list;
var [ , second ] = list;     // skip the first element
```

`loc: { city, state }` does **not** bind `loc`. It goes into `person.loc` and then binds `city` and `state` from there. The `name: displayName` syntax is "take `name`, bind it as `displayName`." People trip over that constantly because `:` in an object *literal* means "this is the value," and `:` in an object *pattern* means "this is the source property."

Defaults in destructuring fire on `undefined`, same as parameter defaults -- not on `null`, not on missing-but-present `0` or `""`.

```js
var { x = 42 } = { x: undefined };     // x is 42
var { x = 42 } = { x: null };          // x is null
var { x = 42 } = {};                   // x is 42
```

Destructuring is not "copy the object." It's "perform a structured get." Getters run. Proxies trap. `[[Prototype]]` is consulted for object patterns (a missing own property can still destructure from the chain). If you only want own properties, that's `Object.hasOwn(..)` / `Object.getOwnProperty*` territory, not destructuring.

## Optional Chains And Nullish Coalescing

Two operators added after ES6 exist specifically to make a very common grammar pattern less noisy: "do this only if the value is present."

```js
record.location?.city
record.location?.city ?? "unknown"
record.getName?.()
records?.[0]
```

`?.` is *optional chaining*. If the value before `?.` is `null` or `undefined`, the whole chain expression evaluates to `undefined` and the rest of the chain does not run. Otherwise it is ordinary property / call / index access.

That is **not** the same as a truthiness check:

```js
record.location && record.location.city
```

If `location` is `0`, `""`, or `false`, `&&` stops. `?.` does not. `?.` only short-circuits on `null` and `undefined`. That's usually what you wanted for "is this object here?" and almost never what you wanted for "is this number non-zero?"

`??` is *nullish coalescing*: `a ?? b` yields `a` unless `a` is `null` or `undefined`, in which case it yields `b`. Contrast `a || b`, which yields `b` for *any* falsy `a` (`0`, `NaN`, `""`, `false`).

```js
port = config.port ?? 80;        // 0 is a valid port, keep it
port = config.port || 80;        // 0 is falsy, become 80 -- probably a bug
```

As mentioned under precedence, `??` refuses to mix with `&&` or `||` without parentheses. That's the language doing you a favor.

```js
a ?? b || c;                     // SyntaxError
(a ?? b) || c;                   // fine
a ?? (b || c);                   // fine, different meaning
```

Optional chaining short-circuits the *access*, not an assignment target. `foo?.bar = 1` is a syntax error. You cannot optional-chain the left-hand side of an assignment.

## `new`, IIFEs, And Other Crowded Productions

A few productions sit so close together that people treat the bugs as "JS being JS" instead of "I didn't parenthesize."

### `new` And Property Access

```js
new Date().getFullYear();
new Date.getFullYear();      // TypeError -- usually
```

`new Foo.bar()` is `new (Foo.bar)()` -- look up `bar` on `Foo`, then construct it.
`new Foo().bar()` is `(new Foo()).bar()` -- construct `Foo`, then call `bar` on the instance.

I remember this only because I have been burned. You should parenthesize whenever `new` shares a line with `.` or `[]`. The precedence table is the authority; your memory is not.

`new` without `()` still constructs: `new Foo` is `new Foo()`. Adding argument lists later can change grouping in a larger expression. Don't rely on the no-paren form.

### The `void` Operator

`void expr` evaluates `expr` and yields `undefined`. That's the whole operator.

```js
void 42;                     // undefined
void function setup(){       // function *expression*, not a declaration
    // ..
}();
```

The second snippet is an IIFE that does not leak a completion value. `void` is also how some style guides "use" a promise they are deliberately not awaiting: `void loadConfig()`. I find a named helper more honest, but you will see `void` in the wild.

### IIFE Grammar

An Immediately Invoked Function Expression needs the `function` keyword to be in *expression* position. Otherwise you get a declaration, and a declaration cannot be followed by `()`:

```js
function setup(){ /* .. */ }();   // SyntaxError

(function setup(){ /* .. */ })(); // fine
(function setup(){ /* .. */ }()); // also fine
+function setup(){ /* .. */ }();  // fine, weird
```

Unary `+` / `!` / `void` also force expression context. Parentheses are the readable way. Named IIFEs (`function setup`) still help stack traces -- that name is in-scope *inside* the function, same as any named function expression (*Scope & Closures*).

Arrow IIFEs exist: `(() => { .. })()`. They're fine. They're also easy to nest into unreadable soup.

### `for` Headers Are Their Own Grammar

```js
for (let i = 0; i < 10; i++) { }
for (let student of students) { }
for (let key in obj) { }
```

Those are three different productions. `for (;;) ` is three expressions (or omitted). `for..of` needs an iterable. `for..in` enumerates keys. Mixing them in your head is how you `for..in` an array and pick up `"hasOwnProperty"`.

`for (let x of xs);` with a trailing semicolon is a loop that runs and does nothing -- the next block is *not* the loop body. ASI and extra semicolons strike here the same as after `if`. I have reviewed that bug more times than I want to admit.

`await for` is not a thing. `for await..of` is (*Sync & Async* Chapter 4). The `await` is part of the `for` production, not a prefix on the whole statement.

## Side Effects You Didn't Mean To Sequence

Expressions can do work besides producing a value: assignment, `++`, function calls, `delete`, `await`. Grammar decides **order**.

```js
var i = 0;
var students = [ "Kyle", "Suzy" ];

students[i++] = students[i++];
```

What is in `students` after that line? It depends on whether the left-hand `i++` runs before the right-hand `i++`, and when the index is captured. The spec defines it. You should not make a reader consult the spec. Split it:

```js
var from = i++;
var to = i++;
students[to] = students[from];
```

Ugly? Good. Visible. The comma operator is the same class of trick:

```js
var name = (console.log("looking up"), students[0].name);
```

It works. It also hides a log in an assignment. I use the comma operator in `for` headers (`i++, j++`) and almost nowhere else.

`++x` vs `x++` is grammar plus a return value. Prefix yields the new number; postfix yields the old. Using either as a value in a larger expression is how you get off-by-one bugs that tests miss because the *assignment* to `x` still happened.

## Blocks, Labels, And Strictness

`{ .. }` as a statement is a block. Blocks are scopes for `let` / `const` / `class` / `function` (in strict mode / modules -- see *Scope & Closures*). They are also the bodies of `if`, loops, `function`, `try`, and `switch` cases (case bodies are not implicitly blocks! wrapping `case` bodies in `{ }` is allowed and often wise).

**Labels** are an almost-forgotten grammar production:

```js
outer: for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
        if (found(i,j)) {
            break outer;
        }
    }
}
```

`break outer` breaks the *labeled* statement, not just the inner loop. `continue outer` continues it. Labels can also label a block that's not a loop, and then only `break` (not `continue`) applies.

I rarely want labels. Nested loops with a named `break` are the one case I will defend. Labeling a block to `break` out of it is usually a sign the block wanted to be a function with `return`.

**Strict mode** is also grammar: `"use strict"` as the first statement of a script or function (or the implicit strictness of modules and `class` bodies) changes which productions are errors. With-statement is banned. Octal literals like `0123` are banned. Duplicate parameter names are banned. `delete` of an unqualified identifier is banned. Assigning to an undeclared identifier is a `ReferenceError` instead of an implicit global. The grammar you are allowed to write is a function of whether strict mode is on.

This series assumes strict mode (modules, `"use strict"`, `class`), because that's the JS you should be writing. If you still maintain sloppy-mode scripts, know that the grammar is *wider* and the runtime is *more surprising*. That's not a feature.

## Grammar Is How Types Show Up

Look back at this chapter's examples and you'll see Chapters 1--4 peeking through every production:

* `&&` / `||` / `if` / `?:` invoke **ToBoolean**.
* `+` sometimes concatenates and sometimes adds, via **ToPrimitive** / **ToNumber** / **ToString**.
* `switch` compares with **`===`**, so it does *not* coerce.
* `?.` and `??` are the rare operators that care about *nullishness*, not truthiness.
* destructuring performs **Get** operations, which means `[[Prototype]]`, getters, and proxies.
* ASI and statement/expression ambiguity decide whether `{` is a block or an object -- an object that then *has* a type.

That's why this book is *Types **&** Grammar*, one title. You don't really know a value until you know the grammar that is about to operate on it. And you don't really know an operator until you know what it does to its operands' types.

If you've made it here, you have the third pillar. The language's values, and the rules for writing them down, are no longer a rumor. They're yours.

The next book, *Sync & Async*, takes these values and this grammar and asks what happens when "now" is not the only time a statement can finish.

## A Program The Parser Disagrees With You About

Let's slow down and *show the work*, the way *Scope & Closures* colored marbles. Here's a snippet I still see in the wild. Predict what it does. Then we'll parse it.

```js
function getStudent(id) {
    if (id)
        return
        {
            id: id,
            name: "Suzy"
        }
}

console.log(getStudent(73));
```

If you said "logs `{ id: 73, name: "Suzy" }`" you parsed it as an English paragraph. The grammar parsed it as:

```js
function getStudent(id) {
    if (id)
        return;          // ASI -- restricted production
    {                    // a BLOCK, not an object
        id: id,          // a LABEL named id
        name: "Suzy"     // expression statement (useless)
    }
}

console.log(getStudent(73));     // undefined
```

Three grammar facts stacked:

1. `return` is a restricted production: a newline after `return` inserts `;`.
2. `{` at statement position is a block, not an object literal.
3. `id: id` inside a block is a label plus an expression, not a property.

The fix is not "never use newlines." The fix is to *know which production you're in*:

```js
function getStudent(id) {
    if (id) {
        return {
            id: id,
            name: "Suzy"
        };
    }
}
```

Braces on the `if`, object on the same line as `return` (or `return (` then a newline then the object -- the `(` keeps the production open). Semicolons if you don't want to run ASI in your head.

That's this whole chapter: folklore ("JS is weird about returns") is almost always an unnamed production. Name it, and the weirdness becomes a rule you can use.

If this example felt cheap, good -- it's famous because it *looks* cheap and still ships bugs. Appendix B has more to practice on.

[^ASI]: "12.10 Automatic Semicolon Insertion", ECMAScript Language Specification; https://262.ecma-international.org/#sec-automatic-semicolon-insertion ; Accessed August 2026
