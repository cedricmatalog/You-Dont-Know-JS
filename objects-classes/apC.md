# You Don't Know JS Yet: Objects & Classes - 2nd Edition
# Appendix C: Practice

This appendix aims to give you some exercises to test and solidify objects, `this`, `class`, and delegation from this book. Try them in an editor. No cheating!

## Dictionary, Not A Prototype Soup

Create `makeDict(pairs)` that returns an object used **only** as a string-key map:

* No inherited `toString` / `hasOwnProperty` on lookup
* `has(key)` is `true` only for own keys (including `"toString"` if inserted)
* `set` / `get` / `keys`

```js
var d = makeDict([ ["toString", 1], ["x", 2] ]);

d.has("toString");           // true
d.get("toString");           // 1
d.has("valueOf");            // false
console.log(d.keys());       // ["toString", "x"]  (order not critical)
```

Hint: Chapter 2, empty `[[Prototype]]`.

## Delegation, Not A Class Tree

Revisit the slot-machine idea from *Get Started* Appendix B -- or a smaller version: two objects, `Label` and `Counter`, cooperating through `this` without `class` and without copying methods onto instances.

* `Label` has `text` and `render()` that logs `text`.
* `Counter` has `count`, `inc()`, and `render()` that logs the count.
* A `LabeledCounter` **delegates** to both behaviors: `inc()` updates count, `render()` prints `text: count`.
* Do **not** use `class` or `new`. `Object.create(..)` is the grain.

```js
var lc = makeLabeledCounter("clicks");
lc.inc();
lc.inc();
lc.render();     // clicks: 2
```

There isn't one right graph. Show the `[[Prototype]]` links (or explicit peer calls, Chapter 5) in a comment.

## Protected-By-Module

Using Appendix B's `WeakMap` pattern, write `Point2d` / `Point3d` where `x` and `y` are not public, but `Point3d.bumpX()` can still change `x`. Outside the module-ish scope (the IIFE / file), `point.x` is `undefined`.

## `this` At The Wrong Call Site

Write `roster.printAll()` as a method on a classroom object that `console.log`s each student's `name`. Then pass `roster.printAll` to `setTimeout` (or a button) **without** wrapping. Predict `this`. Fix it three ways: wrapper function, `bind`, arrow (and say which `this` each uses -- Chapter 4).

```js
var roster = {
    students: [
        { name: "Kyle" },
        { name: "Suzy" }
    ],
    printAll() {
        // ..TODO..
    }
};

setTimeout(roster.printAll, 0);
```

## Own Keys vs Inherited Noise

Write `listOwn(obj)` that returns an array of **own** string keys, including non-enumerable ones, and does **not** include `toString` from `Object.prototype` unless the object actually defined it.

```js
var o = Object.create({ inherited: 1 });
Object.defineProperty(o,"hidden",{ value: 2, enumerable: false });
o.visible = 3;

listOwn(o);                  // includes "hidden", "visible"; not "inherited"
```

Hint: `Object.getOwnPropertyNames` / `Object.hasOwn`, not `for..in`.

## `new` Without `new`

Predict `this.name` after each, in sloppy vs strict, for a prototypal `function Student(name){ this.name = name; }` vs `class Guest { constructor(name){ this.name = name; } }`. Call both *without* `new`.

```js
function Student(name) {
    this.name = name;
}
class Guest {
    constructor(name) {
        this.name = name;
    }
}

Student("Kyle");
Guest("Suzy");
```

Write four outcomes: sloppy `function`, strict `function`, `class` (always strict). Don't run until you've predicted.

## Bind Or Wrapper

`button.addEventListener("click", classroom.printAll)` loses `this`. Write the wrapper and the `bind` fix. Don't use an arrow as the method if `this` should be `classroom`.

```js
var classroom = {
    names: [ "Kyle", "Suzy" ],
    printAll() {
        console.log(this.names.join(", "));
    }
};

// TODO: click handler that still prints Kyle, Suzy
```

Once you have code that works, *compare* your solution(s) to the code in "Suggested Solutions" at the end of this appendix.

## Suggested Solutions

Keep in mind that these suggested solutions are just that: suggestions. There are many different ways to solve these practice exercises. Compare your approach to what you see here, and consider the pros and cons of each.

Suggested solution for "Dictionary":

```js
function makeDict(pairs) {
    var d = Object.create(null);
    var api = {
        set(key,val) {
            d[key] = val;
        },
        get(key) {
            return Object.hasOwn(d,key) ? d[key] : undefined;
        },
        has(key) {
            return Object.hasOwn(d,key);
        },
        keys() {
            return Object.keys(d);
        }
    };
    pairs.forEach(function(pair){
        api.set(pair[0],pair[1]);
    });
    return api;
}
```

The data object `d` is the dictionary. The API is a separate object so callers don't `for..in` the guts. `Object.create(null)` is the actual requirement of the exercise; wrapping it is extra politeness.

----

Suggested solution for "Delegation":

```js
var Label = {
    render() {
        console.log(this.text);
    }
};

var Counter = {
    inc() {
        this.count += 1;
    },
    render() {
        console.log(this.count);
    }
};

function makeLabeledCounter(text) {
    var lc = Object.create(Label);
    lc.text = text;
    lc.count = 0;
    lc.inc = Counter.inc;
    lc.render = function render(){
        console.log(this.text + ": " + this.count);
    };
    return lc;
}
```

That's a *peer* mix, not a deep `[[Prototype]]` chain -- Chapter 5 said both are legal. A chain version would be `Object.create(Counter)` then copy label fields; the important part is you didn't start with `class LabeledCounter extends Counter`.

----

Suggested solution for "Protected-By-Module":

```js
var Points = (function definePoints(){
    var state = new WeakMap();

    class Point2d {
        constructor(x,y) {
            state.set(this,{ x, y });
        }
        getX() {
            return state.get(this).x;
        }
        getY() {
            return state.get(this).y;
        }
    }

    class Point3d extends Point2d {
        constructor(x,y,z) {
            super(x,y);
            state.get(this).z = z;
        }
        bumpX() {
            state.get(this).x += 1;
        }
        getZ() {
            return state.get(this).z;
        }
    }

    return { Point2d, Point3d };
})();

var p = new Points.Point3d(3,4,5);
p.bumpX();
p.getX();            // 4
p.x;                 // undefined
```

`WeakMap` is closed over by both classes -- Book 2's module. `p.x` is undefined because `x` never became a public data property. `p.bumpX` can still mutate because it uses the same map, not `#x`.

Suggested solution for "`this` At The Wrong Call Site":

```js
var roster = {
    students: [
        { name: "Kyle" },
        { name: "Suzy" }
    ],
    printAll() {
        this.students.forEach(function print(s){
            console.log(s.name);
        });
    }
};

// broken: setTimeout calls printAll with this === global / undefined
setTimeout(roster.printAll, 0);

setTimeout(function(){
    roster.printAll();
}, 0);

setTimeout(roster.printAll.bind(roster), 0);

var rosterArrow = {
    students: roster.students,
    printAll: () => {
        // lexical this -- probably NOT roster if this is at top level
    }
};
```

The wrapper keeps the *call site* `roster.printAll()` so `this` is the roster (Chapter 4). `bind` returns a function whose `this` is fixed. An arrow on the method is the wrong fix here: arrows close over the *enclosing* `this`, which in a `var roster = { printAll: () => ... }` at program top is not `roster`. Concise methods (`printAll() { }`) are the grain; fix the *later* call site.

Suggested solution for "Own Keys vs Inherited Noise":

```js
function listOwn(obj) {
    return Object.getOwnPropertyNames(obj);
}
```

`for..in` walks the chain and skips non-enumerable. `Object.keys` is own enumerable only. The exercise wants own, including hidden -- that's `getOwnPropertyNames` (string keys). Symbols would be `getOwnPropertySymbols`. Chapter 2's dictionary used `Object.create(null)` so even `for..in` was safe; this exercise keeps a normal prototype and *asks the right API*.

Suggested solution for "`new` Without `new`":

```js
function Student(name) {
    this.name = name;
}
class Guest {
    constructor(name) {
        this.name = name;
    }
}

Student("Kyle");             // sloppy: globalThis.name = "Kyle"
                             // strict: TypeError (this is undefined)
Guest("Suzy");               // TypeError in both -- class constructors
```

That's Appendix B's `new.target` lesson as practice. `class` always throws. Don't "fix" the function by assigning `this.name` without `new`; throw or `return new Student(name)`.

Suggested solution for "Bind Or Wrapper":

```js
button.addEventListener("click", function(){
    classroom.printAll();
});

button.addEventListener(
    "click",
    classroom.printAll.bind(classroom)
);
```

The wrapper restores the *call site*. `bind` fixes `this` on a new function. An arrow *method* on `classroom` would close over the enclosing `this` (not `classroom` at the top level). Concise methods plus a wrapper at the *later* site are the grain.

That's five exercises: dictionary, delegation, protected WeakMap, `this` at the later call site, own keys, plus the `new` and bind drills. Same shape as *Get Started* Appendix B -- try first, then suggested solutions. If yours differs and still honors the object model, good.

If `makeDict` still inherits `toString` as a method, you didn't `Object.create(null)`. If `LabeledCounter` is a `class extends`, you skipped the assignment. If `point.x` is enumerable data, the WeakMap isn't the store. Those three checks are the appendix.

Do the dictionary first. If `"toString"` as a key fails, stop and fix that before delegation. The prototype chain will only make the next exercises harder.

Try `this` at the wrong call site in the browser console, not only in Node -- `setTimeout` `this` differs (window vs `undefined` in strict). Predict both. That's Chapter 4 wearing a timer, which is Book 5's later. The series is one lesson.

Keep practicing: next time you reach for `extends`, ask whether you wanted a taxonomy or a delegate. Next time you `for..in` a map, ask whether you wanted a dictionary.