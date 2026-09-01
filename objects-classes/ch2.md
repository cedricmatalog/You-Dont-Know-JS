# You Don't Know JS Yet: Objects & Classes - 2nd Edition
# Chapter 2: How Objects Work

Objects are not just containers for multiple values, though clearly that's the context for most interactions with objects.

To fully understand the object mechanism in JS, and get the most out of using objects in our programs, we need to look more closely at a number of characteristics of objects (and their properties) which can affect their behavior when interacting with them.

These characteristics that define the underlying behavior of objects are collectively referred to in formal terms as the "metaobject protocol" (MOP)[^mop]. The MOP is useful not only for understanding how objects will behave, but also for overriding the default behaviors of objects to bend the language to fit our program's needs more fully.

## Property Descriptors

Each property on an object is internally described by what's known as a "property descriptor". This is, itself, an object (aka, "metaobject") with several properties (aka "attributes") on it, dictating how the target property behaves.

We can retrieve a property descriptor for any existing property using `Object.getOwnPropertyDescriptor(..)` (ES5):

```js
myObj = {
    favoriteNumber: 42,
    isDeveloper: true,
    firstName: "Kyle"
};

Object.getOwnPropertyDescriptor(myObj,"favoriteNumber");
// {
//     value: 42,
//     enumerable: true,
//     writable: true,
//     configurable: true
// }
```

We can even use such a descriptor to define a new property on an object, using `Object.defineProperty(..)` (ES5):

```js
anotherObj = {};

Object.defineProperty(anotherObj,"fave",{
    value: 42,
    enumerable: true,     // default if omitted
    writable: true,       // default if omitted
    configurable: true    // default if omitted
});

anotherObj.fave;          // 42
```

If an existing property has not already been marked as non-configurable (with `configurable: false` in its descriptor), it can always be re-defined/overwritten using `Object.defineProperty(..)`.

| WARNING: |
| :--- |
| A number of earlier sections in this chapter refer to "copying" or "duplicating" properties. One might assume such copying/duplication would be at the property descriptor level. However, none of those operations actually work that way; they all do simple `=` style access and assignment, which has the effect of ignoring any nuances in how the underlying descriptor for a property is defined. |

Though it seems far less common out in the wild, we can even define multiple properties at once, each with their own descriptor:

```js
anotherObj = {};

Object.defineProperties(anotherObj,{
    "fave": {
        // a property descriptor
    },
    "superFave": {
        // another property descriptor
    }
});
```

It's not very common to see this usage, because it's rarer that you need to specifically control the definition of multiple properties. But it may be useful in some cases.

### Accessor Properties

A property descriptor usually defines a `value` property, as shown above. However, a special kind of property, known as an "accessor property" (aka, a getter/setter), can be defined. For these a property like this, its descriptor does not define a fixed `value` property, but would instead look something like this:

```js
{
    get() { .. },    // function to invoke when retrieving the value
    set(v) { .. },   // function to invoke when assigning the value
    // .. enumerable, etc
}
```

A getter looks like a property access (`obj.prop`), but under the covers it invokes the `get()` method as defined; it's sort of like if you had called `obj.prop()`. A setter looks like a property assignment (`obj.prop = value`), but it invokes the `set(..)` method as defined; it's sort of like if you had called `obj.prop(value)`.

Let's illustrate a getter/setter accessor property:

```js
anotherObj = {};

Object.defineProperty(anotherObj,"fave",{
    get() { console.log("Getting 'fave' value!"); return 123; },
    set(v) { console.log(`Ignoring ${v} assignment.`); }
});

anotherObj.fave;
// Getting 'fave' value!
// 123

anotherObj.fave = 42;
// Ignoring 42 assignment.

anotherObj.fave;
// Getting 'fave' value!
// 123
```

### Enumerable, Writable, Configurable

Besides `value` or `get()` / `set(..)`, the other 3 attributes of a property descriptor are (as shown above):

* `enumerable`
* `writable`
* `configurable`

The `enumerable` attribute controls whether the property will appear in various enumerations of object properties, such as `Object.keys(..)`, `Object.entries(..)`, `for..in` loops, and the copying that occurs with the `...` object spread and `Object.assign(..)`. Most properties should be left enumerable, but you can mark certain special properties on an object as non-enumerable if they shouldn't be iterated/copied.

The `writable` attribute controls whether a `value` assignment (via `=`) is allowed. To make a property "read only", define it with `writable: false`. However, as long as the property is still configurable, `Object.defineProperty(..)` can still change the value by setting `value` differently.

The `configurable` attribute controls whether a property's **descriptor** can be re-defined/overwritten. A property that's `configurable: false` is locked to its definition, and any further attempts to change it with `Object.defineProperty(..)` will fail. A non-configurable property can still be assigned new values (via `=`), as long as `writable: true` is still set on the property's descriptor.

## Object Sub-Types

There are a variety of specialized sub-types of objects in JS. But by far, the two most common ones you'll interact with are arrays and `function`s.

| NOTE: |
| :--- |
| By "sub-type", we mean the notion of a derived type that has inherited the behaviors from a parent type but then specialized or extended those behaviors. In other words, values of these sub-types are fully objects, but are also *more than just* objects. |

### Arrays

Arrays are objects that are specifically intended to be **numerically indexed**, rather than using string named property locations. They are still objects, so a named property like `favoriteNumber` is legal. But it's greatly frowned upon to mix named properties into numerically indexed arrays.

Arrays are preferably defined with literal syntax (similar to objects), but with the `[ .. ]` square brackets rather than `{ .. }` curly brackets:

```js
myList = [ 23, 42, 109 ];
```

JS allows any mixture of value types in arrays, including objects, other arrays, functions, etc. As you're likely already aware, arrays are "zero-indexed", meaning the first element in the array is at the index `0`, not `1`:

```js
myList = [ 23, 42, 109 ];

myList[0];      // 23
myList[1];      // 42
```

Recall that any string property name on an object that "looks like" an integer -- is able to be validly coerced to a numeric integer -- will actually be treated like an integer property (aka, integer index). The same goes for arrays. You should always use `42` as an integer index (aka, property name), but if you use the string `"42"`, JS will assume you meant that as an integer and do that for you.

```js
// "2" works as an integer index here, but it's not advised
myList["2"];    // 109
```

One exception to the "no named properties on arrays" *rule* is that all arrays automatically expose a `length` property, which is automatically kept updated with the "length" of the array.

```js
myList = [ 23, 42, 109 ];

myList.length;   // 3

// "push" another value onto the end of the list
myList.push("Hello");

myList.length;   // 4
```

| WARNING: |
| :--- |
| Many JS developers incorrectly believe that array `length` is basically a *getter* (see "Accessor Properties" earlier in this chapter), but it's not. The offshoot is that these developers feel like it's "expensive" to access this property -- as if JS has to on-the-fly recompute the length -- and will thus do things like capture/store the length of an array before doing a non-mutating loop over it. This used to be "best practice" from a performance perspective. But for at least 10 years now, that's actually been an anti-pattern, because the JS engine is more efficient at managing the `length` property than our JS code is at trying to "outsmart" the engine to avoid invoking something we think is a *getter*. It's more efficient to let the JS engine do its job, and just access the property whenever and however often it's needed. |

#### Empty Slots

JS arrays also have a really unfortunate "flaw" in their design, referred to as "empty slots". If you assign an index of an array more than one position beyond the current end of the array, JS will leave the in between slots "empty" rather than auto-assigning them to `undefined` as you might expect:

```js
myList = [ 23, 42, 109 ];
myList.length;              // 3

myList[14] = "Hello";
myList.length;              // 15

myList;                     // [ 23, 42, 109, empty x 11, "Hello" ]

// looks like a real slot with a
// real `undefined` value in it,
// but beware, it's a trick!
myList[9];                  // undefined
```

You might wonder why empty slots are so bad? One reason: there are APIs in JS, like array's `map(..)`, where empty slots are surprisingly skipped over! Never, ever intentionally create empty slots in your arrays. This in undebateably one of JS's "bad parts".

### Functions

I don't have much specifically to say about functions here, other than to point out that they are also sub-object-types. This means that in addition to being executable, they can also have named properties added to or accessed from them.

Functions have two pre-defined properties you may find yourself interacting with, specifically for meta-programming purposes:

```js
function help(opt1,opt2,...remainingOpts) {
    // ..
}

help.name;          // "help"
help.length;        // 2
```

The `length` of a function is the count of its explicitly defined parameters, up to but not including a parameter that either has a default value defined (e.g., `param = 42`) or a "rest parameter" (e.g., `...remainingOpts`).

#### Avoid Setting Function-Object Properties

You should avoid assigning properties on function objects. If you're looking to store extra information associated with a function, use a separate `Map(..)` (or `WeakMap(..)`) with the function object as the key, and the extra information as the value.

```js
extraInfo = new Map();

extraInfo.set(help,"this is some important information");

// later:
extraInfo.get(help);   // "this is some important information"
```

## Object Characteristics

In addition to defining behaviors for specific properties, certain behaviors are configurable across the whole object:

* extensible
* sealed
* frozen

### Extensible

Extensibility refers to whether an object can have new properties defined/added to it. By default, all objects are extensible, but you can change shut off extensibility for an object:

```js
myObj = {
    favoriteNumber: 42
};

myObj.firstName = "Kyle";                  // works fine

Object.preventExtensions(myObj);

myObj.nicknames = [ "getify", "ydkjs" ];   // fails
myObj.favoriteNumber = 123;                // works fine
```

In non-strict-mode, an assignment that creates a new property will silently fail, whereas in strict mode an exception will be thrown.

### Sealed

Sealing an object is a stronger lock-down than merely preventing extensions. `Object.seal(..)` both shuts off extensibility *and* marks all existing properties as non-configurable:

```js
myObj = {
    favoriteNumber: 42
};

Object.seal(myObj);

myObj.nicknames = [ "getify", "ydkjs" ];   // fails
myObj.favoriteNumber = 123;                // works fine
delete myObj.favoriteNumber;               // fails
```

You can still reassign the values of existing writable properties. What you cannot do is add new properties, delete existing ones, or reconfigure their descriptors (for example, flipping `writable` or `enumerable`).

Under the covers, sealing is essentially:

```js
Object.preventExtensions(myObj);

for (let key of Reflect.ownKeys(myObj)) {
    let desc = Object.getOwnPropertyDescriptor(myObj,key);
    if (desc.configurable) {
        desc.configurable = false;
        Object.defineProperty(myObj,key,desc);
    }
}
```

`Object.isSealed(myObj)` reports whether an object is in this state. A sealed object is also non-extensible, so `Object.isExtensible(myObj)` will be `false`.

| NOTE: |
| :--- |
| Sealing (and freezing, next) only affect the object you pass in. Nested objects held as property values are not automatically sealed. If you need a deeply sealed structure, you have to walk the object graph yourself. |

### Frozen

Freezing is the strongest of the three object-wide characteristics. `Object.freeze(..)` seals the object *and* marks all existing data properties as non-writable:

```js
myObj = {
    favoriteNumber: 42
};

Object.freeze(myObj);

myObj.favoriteNumber = 123;                // fails
myObj.nicknames = [ "getify" ];            // fails
delete myObj.favoriteNumber;               // fails
```

A frozen object is a shallowly immutable snapshot of its own properties: no additions, no deletions, no reconfigurations, and no reassignments of data properties. Accessor properties (getters/setters) can still run -- their *descriptors* are locked, but a setter, if present, can still have side effects when invoked.

```js
Object.isFrozen(myObj);                    // true
Object.isSealed(myObj);                    // true
Object.isExtensible(myObj);                // false
```

As with sealing, freezing is shallow. If a frozen object's property holds another object, *that* object is not frozen unless you freeze it separately.

| WARNING: |
| :--- |
| `const` does **not** freeze an object. `const` only prevents reassignment of the *binding*. The object value itself remains mutable unless you `Object.freeze(..)` it. This is one of the most common mix-ups I see when developers reach for `const` expecting immutability. |

If you want a convenient mental ranking of these object-wide locks:

1. extensible (the default): anything goes
2. non-extensible (`Object.preventExtensions(..)`): no new properties
3. sealed (`Object.seal(..)`): no new properties, no deleting, no reconfiguring
4. frozen (`Object.freeze(..)`): all of the above, plus no reassigning data properties

## Extending The MOP

As mentioned at the start of this chapter, objects in JS behave according to a set of rules referred to as the Metaobject Protocol (MOP)[^mop]. Now that we understand more fully how objects work by default, we want to turn our attention to how we can hook into some of these default behaviors and override/customize them.

There are two main extension points: well-known symbols, which let an object customize specific built-in algorithms, and `Proxy`, which lets you intercept the fundamental operations the engine performs on an object.

### Well-Known Symbols

JS pre-defines a set of symbol values on the `Symbol` function object. These *well-known symbols* are hooks into built-in behaviors. If you define a property on an object using one of these symbols as the key, you're customizing how that object participates in some language operation.

A few of the most important:

```js
myObj = {
    [Symbol.toStringTag]: "Point",

    [Symbol.toPrimitive](hint) {
        if (hint == "number") {
            return this.x;
        }
        return `Point(${this.x},${this.y})`;
    },

    x: 3,
    y: 4
};

String(myObj);                 // "Point(3,4)"
Number(myObj);                 // 3
Object.prototype.toString.call(myObj);
// "[object Point]"
```

`Symbol.toStringTag` customizes the default `Object.prototype.toString()` result -- that's the `"[object Point]"` you saw in the Chapter 3 class example. `Symbol.toPrimitive` customizes how the object is coerced to a primitive (covered in depth in the *Types & Grammar* book).

Other well-known symbols you'll encounter throughout JS:

* `Symbol.iterator` / `Symbol.asyncIterator`: make an object iterable (`for..of`, spread, etc). We'll come back to iteration in *Sync & Async*.
* `Symbol.hasInstance`: customize the behavior of `instanceof`.
* `Symbol.species`: let a class control what constructor derived methods (like `Array.prototype.map(..)`) use when creating a new instance.
* `Symbol.isConcatSpreadable`: control whether `Array.prototype.concat(..)` flattens this object.
* `Symbol.toStringTag`: as shown above.
* `Symbol.toPrimitive`: as shown above.
* `Symbol.match` / `Symbol.replace` / `Symbol.search` / `Symbol.split`: customize how an object participates in `String` methods like `.match(..)`, `.replace(..)`, etc.

```js
class FancyArray extends Array {
    static get [Symbol.species]() {
        return Array;
    }
}

var fancy = new FancyArray(1,2,3);

mapped = fancy.map(v => v * 2);

mapped instanceof FancyArray;     // false
mapped instanceof Array;          // true
```

By defining `Symbol.species` as `Array`, `map(..)` creates a regular array instead of another `FancyArray`. That's a MOP hook: you're intercepting a built-in algorithm's "what constructor should I use?" question.

| NOTE: |
| :--- |
| Well-known symbols are not "magic" in the sense of being invisible. They're just ordinary properties whose keys happen to be the well-known symbol values. `Object.getOwnPropertySymbols(..)` will list them. They *are* typically non-enumerable when defined via `class` fields or `Object.defineProperty(..)`, which is why `for..in` and `Object.keys(..)` skip them. |

### Proxies

Well-known symbols customize *specific* built-in algorithms. `Proxy` customizes the *generic* operations the engine performs against an object: getting a property, setting a property, calling a function, enumerating keys, and so on.

A proxy is an object that wraps another object (the *target*) and optionally intercepts operations via *traps*:

```js
target = {
    favoriteNumber: 42
};

handler = {
    get(target,key,receiver) {
        console.log(`getting ${ String(key) }`);
        return Reflect.get(target,key,receiver);
    },
    set(target,key,val,receiver) {
        console.log(`setting ${ String(key) } = ${ val }`);
        return Reflect.set(target,key,val,receiver);
    }
};

myObj = new Proxy(target,handler);

myObj.favoriteNumber;
// getting favoriteNumber
// 42

myObj.favoriteNumber = 123;
// setting favoriteNumber = 123
```

The `handler` object lists only the traps you want to intercept. Any operation you don't trap is forwarded to the target automatically.

`Reflect` is the companion to `Proxy`. Each proxy trap has a same-named function on `Reflect` that performs the *default* MOP behavior for that operation. That's why the snippet above uses `Reflect.get(..)` and `Reflect.set(..)` inside the traps: we're intercepting to log, then asking the engine to do the normal thing.

| WARNING: |
| :--- |
| Always pass the `receiver` through to `Reflect.get(..)` / `Reflect.set(..)`. The `receiver` is the object the operation was originally performed against -- which is not necessarily the `target`, especially once `[[Prototype]]` delegation or another proxy is involved. Dropping `receiver` is a classic proxy bug that breaks getters/setters and prototype delegation. |

The available traps correspond to the fundamental MOP operations, including:

* `get`, `set`, `has` (`in`), `deleteProperty` (`delete`)
* `ownKeys` (`Object.keys(..)`, `Object.getOwnPropertyNames(..)`, etc)
* `getOwnPropertyDescriptor`, `defineProperty`
* `getPrototypeOf`, `setPrototypeOf`
* `isExtensible`, `preventExtensions`
* `apply` (function call), `construct` (`new`)

```js
logged = [];

fn = new Proxy(function help(){
    return 42;
},{
    apply(target,thisArg,args) {
        logged.push([ thisArg, args ]);
        return Reflect.apply(target,thisArg,args);
    }
});

fn(1,2);            // 42
logged;
// [ [ undefined, [ 1, 2 ] ] ]
```

#### Proxy Invariants

You cannot make a proxy do *anything*. The MOP has invariants the engine enforces, so that proxies cannot report contradictory facts about an object. For example, if the target is non-extensible, a proxy cannot claim (via `ownKeys` or `getOwnPropertyDescriptor`) that a new own property exists. If a property is non-configurable and non-writable, a `get` trap cannot return a different value than the target holds.

If you violate an invariant, the engine throws a `TypeError`. That's not optional, and you cannot catch-and-ignore it from inside the trap -- the throw happens *after* your trap returns, as the engine validates the result.

#### Revocable Proxies

`Proxy.revocable(..)` creates a proxy you can shut off later:

```js
var { proxy: myObj, revoke } = Proxy.revocable(target,handler);

myObj.favoriteNumber;      // 42

revoke();

myObj.favoriteNumber;
// TypeError: Cannot perform 'get' on a proxy that has
// been revoked
```

This is useful for capability-style designs: hand out an object, then later take away access without needing the consumer to cooperate.

#### What Proxies Are (And Aren't) For

Proxies are a meta-programming tool. They're excellent for:

* logging / debugging property access
* wrapping remote or lazy resources behind a local object API
* enforcing extra constraints (validation, access control)
* implementing virtual objects that don't exist as a concrete table of properties

They are **not** a general-purpose feature for everyday application code. A proxy adds both cognitive overhead (readers must understand the traps) and runtime overhead (every operation is now an extra function call). If you find yourself proxying every object in the system, you've probably reached for too big a hammer.

Also keep in mind: `===` identity is preserved for the *proxy*, not the target. `myObj === target` is `false`. That matters for `WeakMap` keys, DOM node identity, and any code that caches objects by reference.

We'll use well-known symbols again in later chapters (and in *Types & Grammar* and *Sync & Async*). Proxies, though, are the deepest MOP extension point JS currently offers: they let you replace the object's operating system, not just a few of its system calls.

## `[[Prototype]]` Chain

One of the most important, but least obvious, characteristics of an object (part of the MOP) is referred to as its "prototype chain"; the official JS specification notation is `[[Prototype]]`. Make sure not to confuse this `[[Prototype]]` with a public property named `prototype`. Despite the naming, these are distinct concepts.

The `[[Prototype]]` is an internal linkage that an object gets by default when its created, pointing to another object. This linkage is a hidden, often subtle characteristic of an object, but it has profound impacts on how interactions with the object will play out. It's referred to as a "chain" because one object links to another, which in turn links to another, ... and so on. There is an *end* or *top* to this chain, where the linkage stops and there's no further to go. More on that shortly.

We already saw several implications of `[[Prototype]]` linkage in Chapter 1. For example, by default, all objects are `[[Prototype]]`-linked to the built-in object named `Object.prototype`.

| WARNING: |
| :--- |
| That `Object.prototype` name itself can be confusing, since it uses a property called `prototype`. How are `[[Prototype]]` and `prototype` related!? Put such questions/confusion on pause for a bit, as we'll come back an explain the differences between `[[Prototype]]` and `prototype` later in this chapter. For the moment, just assume the presence of this important but weirdly named built-in object, `Object.prototype`. |

Let's consider some code:

```js
myObj = {
    favoriteNumber: 42
};
```

That should look familiar from Chapter 1. But what you *don't see* in this code is that the object there was automatically linked (via its internal `[[Prototype]]`) to that automatically built-in, but weirdly named, `Object.prototype` object.

When we do things like:

```js
myObj.toString();                             // "[object Object]"

myObj.hasOwnProperty("favoriteNumber");   // true
```

We're taking advantage of this internal `[[Prototype]]` linkage, without really realizing it. Since `myObj` does not have `toString` or `hasOwnProperty` properties defined on it, those property accesses actually end up **DELEGATING** the access to continue its lookup along the `[[Prototype]]` chain.

Since `myObj` is `[[Prototype]]`-linked to the object named `Object.prototype`, the lookup for `toString` and `hasOwnProperty` properties continues on that object; and indeed, these methods are found there!

The ability for `myObj.toString` to access the `toString` property even though it doesn't actually have it, is commonly referred to as "inheritance", or more specifically, "prototypal inheritance". The `toString` and `hasOwnProperty` properties, along with many others, are said to be "inherited properties" on `myObj`.

| NOTE: |
| :--- |
| I have a lot of frustrations with the usage of the word "inheritance" here -- it should be called "delegation"! --  but that's what most people refer to it as, so we'll begrudgingly comply and use that same terminology for now (albeit under protest, with " quotes). I'll save my objections for [Appendix A](apA.md) of this book. |

`Object.prototype` has several built-in properties and methods, all of which are "inherited" by any object that is `[[Prototype]]`-linked, either directly or indirectly through another object's linkage, to `Object.prototype`.

Some common "inherited" properties from `Object.prototype` include:

* `constructor`
* `__proto__`
* `toString()`
* `valueOf()`
* `hasOwnProperty(..)`
* `isPrototypeOf(..)`

Recall `hasOwnProperty(..)`, which we saw earlier gives us a boolean check for whether a certain property (by string name) is owned by an object:

```js
myObj = {
    favoriteNumber: 42
};

myObj.hasOwnProperty("favoriteNumber");   // true
```

It's always been considered somewhat unfortunate (semantic organization, naming conflicts, etc) that such an important utility as `hasOwnProperty(..)` was included on the Object `[[Prototype]]` chain as an instance method, instead of being defined as a static utility.

As of ES2022, JS has finally added the static version of this utility: `Object.hasOwn(..)`.

```js
myObj = {
    favoriteNumber: 42
};

Object.hasOwn(myObj,"favoriteNumber");   // true
```

This form is now considered the more preferable and robust option, and the instance method (`hasOwnProperty(..)`) form should now generally be avoided.

Somewhat unfortunately and inconsistently, there's not (yet, as of time of writing) corresponding static utilities, like `Object.isPrototype(..)` (instead of the instance method `isPrototypeOf(..)`). But at least `Object.hasOwn(..)` exists, so that's progress.

### Creating An Object With A Different `[[Prototype]]`

By default, any object you create in your programs will be `[[Prototype]]`-linked to that `Object.prototype` object. However, you can create an object with a different linkage like this:

```js
myObj = Object.create(differentObj);
```

The `Object.create(..)` method takes its first argument as the value to set for the newly created object's `[[Prototype]]`.

One downside to this approach is that you aren't using the `{ .. }` literal syntax, so you don't initially define any contents for `myObj`. You typically then have to define properties one-by-one, using `=`.

| NOTE: |
| :--- |
| The second, optional argument to `Object.create(..)` is -- like the second argument to `Object.defineProperties(..)` as discussed earlier -- an object with properties that hold descriptors to initially define the new object with. In practice out in the wild, this form is rarely used, likely because it's more awkward to specify full descriptors instead of just name/value pairs. But it may come in handy in some limited cases. |

Alternately, but less preferably, you can use the `{ .. }` literal syntax along with a special (and strange looking!) property:

```js
myObj = {
    __proto__: differentObj,

    // .. the rest of the object definition
};
```

| WARNING: |
| :--- |
| The strange looking `__proto__` property has been in some JS engines for more than 20 years, but was only standardized in JS as of ES6 (in 2015). Even still, it was added in Appendix B of the specification[^specApB], which lists features that TC39 begrudgingly includes because they exist popularly in various browser-based JS engines and therefore are a de-facto reality even if they didn't originate with TC39. This feature is thus "guaranteed" by the spec to exist in all conforming browser-based JS engines, but is not necessarily guaranteed to work in other independent JS engines. Node.js uses the JS engine (v8) from the Chrome browser, so Node.js gets `__proto__` by default/accident. Be careful when using `__proto__` to be aware of all the JS engine environments your code will run in. |

Whether you use `Object.create(..)` or `__proto__`, the created object in question will usually be `[[Prototype]]`-linked to a different object than the default `Object.prototype`.

#### Empty `[[Prototype]]` Linkage

We mentioned above that the `[[Prototype]]` chain has to stop somewhere, so as to have lookups not continue forever. `Object.prototype` is typically the top/end of every `[[Prototype]]` chain, as its own `[[Prototype]]` is `null`, and therefore there's nowhere else to continue looking.

However, you can also define objects with their own `null` value for `[[Prototype]]`, such as:

```js
emptyObj = Object.create(null);
// or: emptyObj = { __proto__: null }

emptyObj.toString;   // undefined
```

It can be quite useful to create an object with no `[[Prototype]]` linkage to `Object.prototype`. For example, as mentioned in Chapter 1, the `in` and `for..in` constructs will consult the `[[Prototype]]` chain for inherited properties. But this may be undesirable, as you may not want something like `"toString" in myObj` to resolve successfully.

Moreover, an object with an empty `[[Prototype]]` is safe from any accidental "inheritance" collision between its own property names and the ones it "inherits" from elsewhere. These types of (useful!) objects are sometimes referred to in popular parlance as "dictionary objects".

### `[[Prototype]]` vs `prototype`

Notice that public property name `prototype` in the name/location of this special object, `Object.prototype`? What's that all about?

`Object` is the `Object(..)` function; by default, all functions (which are themselves objects!) have such a `prototype` property on them, pointing at an object.

Any here's where the name conflict between `[[Prototype]]` and `prototype` really bites us. The `prototype` property on a function doesn't define any linkage that the function itself experiences. Indeed, functions (as objects) have their own internal `[[Prototype]]` linkage somewhere else -- more on that in a second.

Rather, the `prototype` property on a function refers to an object that should be *linked TO* by any other object that is created when calling that function with the `new` keyword:

```js
myObj = {};

// is basically the same as:
myObj = new Object();
```

Since the `{ .. }` object literal syntax is essentially the same as a `new Object()` call, the built-in object named/located at `Object.prototype` is used as the internal `[[Prototype]]` value for the new object we create and name `myObj`.

Phew! Talk about a topic made significantly more confusing just because of the name overlap between `[[Prototype]]` and `prototype`!

----

But where do functions themselves (as objects!) link to, `[[Prototype]]` wise? They link to `Function.prototype`, yet another built-in object, located at the `prototype` property on the `Function(..)` function.

In other words, you can think of functions themselves as having been "created" by a `new Function(..)` call, and then `[[Prototype]]`-linked to the `Function.prototype` object. This object contains properties/methods all functions "inherit" by default, such as `toString()` (to string serialize the source code of a function) and `call(..)` / `apply(..)` / `bind(..)` (we'll explain these later in this book).

## Objects Behavior

Properties on objects are internally defined and controlled by a "descriptor" metaobject, which includes attributes such as `value` (the property's present value) and `enumerable` (a boolean controlling whether the property is included in enumerable-only listings of properties/property names).

The way object and their properties work in JS is referred to as the "metaobject protocol" (MOP)[^mop]. We can control the precise behavior of properties via `Object.defineProperty(..)`, as well as object-wide behaviors with `Object.freeze(..)`. But even more powerfully, we can hook into and override certain default behaviors on objects using well-known Symbols, and intercept the operations themselves with `Proxy` (paired with `Reflect`).

Prototypes are internal linkages between objects that allow property or method access against one object -- if the property/method requested is absent -- to be handled by "delegating" that access lookup to another object. When the delegation involves a method, the context for the method to run in is shared from the initial object to the target object via the `this` keyword.

[^mop]: "Metaobject", Wikipedia; https://en.wikipedia.org/wiki/Metaobject ; Accessed July 2022.

[^specApB]: "Appendix B: Additional ECMAScript Features for Web Browsers", ECMAScript 2022 Language Specification; https://262.ecma-international.org/13.0/#sec-additional-ecmascript-features-for-web-browsers ; Accessed July 2022
