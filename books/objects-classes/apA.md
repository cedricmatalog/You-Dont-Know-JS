# You Don't Know JS Yet: Objects & Classes - 2nd Edition
# Appendix A: "Inheritance" Objections

In Chapter 2 I promised I'd come back to why I keep putting quotes around "inheritance" when talking about `[[Prototype]]`. This appendix is that argument. You don't have to agree with me. You *do* have to understand the distinction, because mixing up the two ideas is how a lot of JS code ends up with a confused design.

## Copying vs Linking

Classical inheritance, as practiced in languages like Java, C++, and C#, is a *copy* operation -- at least in the mental model, and often in the implementation.

You define a `Vehicle` class. You define a `Car` class that extends `Vehicle`. When you instantiate a `Car`, the instance is thought of as *a Car, which is a Vehicle*. The subclass is a specialization of the superclass. Fields and methods from the parent are conceptually *copied into* (or flattened onto) the child. After construction, you have one object that "is" all of its types at once.

JS's `[[Prototype]]` mechanism does not copy. It **links**.

```js
var Vehicle = {
    engines: 1,
    ignition() {
        console.log("Turning on my engine.");
    },
    drive() {
        this.ignition();
        console.log("Steering and moving forward!");
    }
};

var Car = Object.create(Vehicle);

Car.wheels = 4;

Car.drive = function drive() {
    Vehicle.drive.call(this);
    console.log(
        `Rolling on all ${ this.wheels } wheels!`
    );
};

var myCar = Object.create(Car);

myCar.drive();
// Turning on my engine.
// Steering and moving forward!
// Rolling on all 4 wheels!
```

`myCar` does not *contain* a copy of `drive` or `ignition`. At the moment `myCar.drive()` is invoked, the engine walks the `[[Prototype]]` chain: `myCar` → `Car` → `Vehicle`. Methods stay where they were defined. What is shared is **the lookup**, and, via `this`, **the execution context**.

That is delegation. It is not inheritance in the classical, copy-down, "is-a" sense -- even though `instanceof` and the `class` keyword go out of their way to *look* like that model.

## "Is-A" vs "Was-A-Delegate-Of"

Classical OO asks you to taxonomize the world: a `Car` *is-a* `Vehicle`. That taxonomy is author-time, hierarchical, and tends to get brittle the moment a real domain doesn't fit a single tree -- which is almost immediately. Multiple inheritance, mixins, "interface + abstract base," and every other OO workaround exist because *is-a* is too rigid.

Delegation asks a different question: at this moment, can this object *hand this task off* to that object? `myCar` is not a `Vehicle`. `myCar` **delegates** `ignition()` to `Vehicle` when it doesn't have its own. That's a runtime peer relationship expressed through a link, not a subtype relationship expressed through a taxonomy.

`class` in JS is syntactic sugar (with some extra semantics -- see Chapter 3) over this same linking. A `class Car extends Vehicle` still does not copy methods onto instances. It wires `Car.prototype` to `Vehicle.prototype` via `[[Prototype]]`. Instances of `Car` then link to `Car.prototype`. The chain is still a chain of *objects*, not a copy of a class template.

If you design as if copying were happening -- for example, expecting a subclass to automatically see private fields from its parent, or expecting `super` to mean "the rest of me that was copied" -- JS will surprise you. Those surprises are not bugs in JS. They're collisions between a classical mental model and a delegation mechanism.

## Why The Word Matters

I don't object to the word "inheritance" because I enjoy being pedantic about vocabulary. I object because the word smuggles in a design method.

If you say "prototypal inheritance," you will tend to:

* build class hierarchies first, objects second
* reach for `extends` whenever two things are related
* treat `this` as "the instance of the class," rather than "the dynamic context of this call"
* get stuck when a relationship isn't hierarchical (it usually isn't)

If you say "delegation," you will tend to:

* build objects that each do some job well
* link them so that a call can be *shared* rather than *reimplemented*
* use `this` as a context-passing mechanism (Chapter 4)
* keep the graph of objects wide and shallow instead of tall and brittle

Chapter 5 is the constructive version of this appendix: what code looks like when you actually design with delegation. This appendix is just the warning label on the word.

## `class` Is Still Fine

None of this is an instruction to delete every `class` from your codebase.

`class` is a real, well-supported syntax for a real, well-understood design pattern. If your problem *is* a taxonomy -- UI widgets, AST nodes, error types -- `class` can be a clean fit, and you should use it with a clear understanding of the prototype machinery underneath (Chapters 2 and 3).

My claim is narrower: **do not let the word "inheritance" convince you that JS's object system is a broken version of Java's.** It isn't. It's a linking system that can *emulate* classes, and can also do things classes are clumsy at. Use the emulation when it helps. Don't confuse the emulation for the mechanism.

## See The Link, Not The Copy

Take the Chapter 5 slot-machine / classroom instinct and make the copy-vs-link test visible.

```js
var Student = {
    print() {
        console.log(this.name);
    }
};

var suzy = Object.create(Student);
suzy.name = "Suzy";

var kyle = Object.create(Student);
kyle.name = "Kyle";

Student.print = function print(){
    console.log("student:", this.name);
};

suzy.print();                // student: Suzy
kyle.print();                // student: Kyle
```

If methods had been *copied* onto `suzy` and `kyle` at create time, changing `Student.print` later would not change their behavior. It does. Both lookups walk to `Student`. That is the whole appendix in a runnable file.

`class` does the same walk:

```js
class Student {
    constructor(name) {
        this.name = name;
    }
    print() {
        console.log(this.name);
    }
}

var suzy = new Student("Suzy");
Student.prototype.print = function print(){
    console.log("student:", this.name);
};
suzy.print();                // student: Suzy
```

`class` hid the `.prototype` assignment. It did not copy `print` onto `suzy`. `suzy.print` is still a lookup. People who say "classes copy methods onto instances" will not predict this. People who say "the instance delegates to the prototype object" will.

## `instanceof` Is A Chain Query

```js
suzy instanceof Student;     // true -- walks [[Prototype]] for Student.prototype
Student.prototype.isPrototypeOf(suzy);  // the same idea, as a method
```

`instanceof` does not mean "was constructed by this function" in a forensic sense. You can `Object.setPrototypeOf` and lie. You can `Point3d.prototype = Object.create(Point2d.prototype)` (Appendix B) and `instanceof` follows the *current* chain. That's linking, again.

`Symbol.hasInstance` lets a constructor customize `instanceof`. Don't, unless you are writing a library that already documents a brand. Cute `hasInstance` is how `x instanceof Foo` stops meaning the chain.

## Mixins Are Copying On Purpose

Sometimes you *do* copy:

```js
function mixin(target,source) {
    Object.assign(target,source);
    return target;
}

var Printer = {
    print() { console.log(this.name); }
};

var suzy = mixin({ name: "Suzy" }, Printer);
```

`suzy` now *has* its own `print`. Changing `Printer.print` later does not change `suzy`. That's classical-flavored copying implemented with `Object.assign`. It is legal. It is not `[[Prototype]]`. If you mixin and also `Object.create`, you now have two stories in one object. Pick one.

Chapter 5 prefers linking for shared behavior and `this` for context. Mixins are how people fake multiple inheritance. JS gives you one `[[Prototype]]`. That's a hint.

## Private Fields Do Not Walk

```js
class Student {
    #id;
    constructor(id,name) {
        this.#id = id;
        this.name = name;
    }
}

class Guest extends Student {
    reveal() {
        return this.#id;     // SyntaxError -- #id is Student-private
    }
}
```

Classical "protected" would have let `Guest` see `#id`. JS did not grow that (Appendix B). Delegation/linking does not copy the slot. The subclass is not "the rest of the instance that was inherited." It is another prototype object and a constructor that `super`s. If you expected a copied field, this error is the appendix's punchline.

Practice (Appendix C) is where you write the WeakMap version and the `Object.create(null)` dictionary and feel the difference in your fingers.

## `constructor` Is A Property, Not Magic

```js
function Student(name) {
    this.name = name;
}
var suzy = new Student("Suzy");
suzy.constructor === Student;            // true -- found on Student.prototype

function Guest(name) {
    Student.call(this,name);
}
Guest.prototype = Object.create(Student.prototype);
// forgot Guest.prototype.constructor = Guest

var g = new Guest("Kyle");
g.constructor === Student;               // true -- oops, still Student
```

`class` sets `.constructor` for you. Hand-wired prototypes forget it. Nothing "breaks" until you use `new g.constructor()` as a factory and get a `Student`. Linking does not maintain a parallel "class" metadata story unless you do.

`suzy.constructor` is a lookup. You can assign `suzy.constructor = 42`. You can `Object.defineProperty` it non-enumerable like `class` does. None of that is the `[[Prototype]]` link. Don't debug inheritance by logging `.constructor` alone -- walk `Object.getPrototypeOf`.

## Two Graphs For One Classroom

Kyle (counter of quiz attempts) and Suzy (label of the quiz name) cooperating is Chapter 5. The inheritance-shaped version is `class LabeledCounter extends Counter`. The delegation-shaped version is `Object.create` plus `this`. Both can print `"clicks: 2"`. Only one of them claims Kyle *is-a* Counter.

If the product later needs a labeled *timer* that is not a counter, the `extends` tree wants another subclass or a mixin. The peer graph adds a `Timer` object and a `this` call. That is why the word matters: it decides which graph you reach for when the domain refuses to stay a tree -- which is immediately, in any real classroom app.

Don't delete `class`. Do notice when you typed `extends` because the word "inheritance" was sitting on the keyboard, not because you had a taxonomy.

## `Object.create(null)` Is A Dictionary, Not A Broken Object

```js
var dict = Object.create(null);
dict.toString = 1;
dict.toString;               // 1
({}).toString;               // function
```

Chapter 2 already walked this: a dictionary that might contain the key `"toString"` *must not* delegate to `Object.prototype`. That's not hostility to objects. That's picking the empty chain so lookup means own keys. `class` instances should *not* be `Object.create(null)` -- they need `Object.prototype` (and your prototype) for methods. Mixing "I wanted a map" with "I wanted a student" is how `hasOwnProperty` as a key eats your method.

`Map` is the other honest dictionary (any keys). This appendix exists so you don't call `[[Prototype]]` "inheritance" *or* call a prototype-linked POJO a map. Two tools. Two names.

That's the exploring of the word. Appendix B is the pre-`class` wiring and the protected hole. Appendix C is your turn to type.
