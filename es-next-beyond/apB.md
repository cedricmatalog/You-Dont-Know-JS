# You Don't Know JS Yet: ES.Next & Beyond - 2nd Edition
# Appendix B: Practice

This appendix aims to give you some exercises to test and solidify the "what's actually JS" judgment this book is for. Try them in an editor where you can. Temporal may need a polyfill; the *types* in your solution still count if you can't run it yet.

## Map Keys, Not String Soup

You have workshop attendees as objects. You need to record "has signed in" per attendee object, not per name (two Kyles exist).

```js
var kyleA = { id: 14, name: "Kyle" };
var kyleB = { id: 99, name: "Kyle" };

function makeSignIn() {
    // ..TODO.. return { signIn(person), hasSignedIn(person) }
}

var log = makeSignIn();
log.signIn(kyleA);
log.hasSignedIn(kyleA);      // true
log.hasSignedIn(kyleB);      // false
log.hasSignedIn({ id: 14, name: "Kyle" });  // false -- different object
```

Do **not** use `person.id` as an object-property key if you can help it. Chapter 3 is the hint.

## Which Temporal Type?

For each, name the Temporal type you'd store (not `Date`). One sentence why.

1. A log line: "the request finished."
2. Suzy's birthday, for a yearly reminder.
3. A calendar invite: July 7, 2022, 11:00 in Chicago.
4. "The workshop is 90 minutes long."
5. "April 15" (tax day), any year.

## Stage Discipline

Pick a proposal from Chapter 5 (pipes, pattern matching, composites, `using`). Write:

* current stage (look it up -- don't trust this book's snapshot blindly)
* one production rule: "we will / will not use this until ____"
* which pillar it touches (scope, objects, types, time, or "host/module graph")

There is no suggested code for this one. The answer is a paragraph in your team's README.

## `?.` How Far?

Rewrite `firstCourse` so it does not throw for `null` students, missing `enrollment`, or missing `courses`, and returns `"none"` in those cases. Do **not** optional-chain so far that a programming error (e.g. `student` is a number) becomes `"none"`.

```js
function firstCourse(student) {
    // ..TODO..
}

firstCourse({ enrollment: { courses: [ "YDKJS" ] } }); // "YDKJS"
firstCourse({ name: "Kyle" });                         // "none"
firstCourse(null);                                     // "none"
```

## `scheduleMeeting` With Temporal

*Get Started* Appendix B compared `"07:30"` strings. Chapter 4 of this book did it with Temporal. Write `scheduleMeeting(startTime, durationMinutes, workDay)` for Chicago on `2022-07-07` with work hours `07:30`--`17:45`. Same assertions as Book 1. Use `PlainTime` / `PlainDate` / `ZonedDateTime`. No `Date`. No minute-of-day integers you invented unless you can defend them as a *display* helper.

```js
var workDay = {
    timeZone: "America/Chicago",
    date: "2022-07-07",
    start: "07:30",
    end: "17:45"
};

function scheduleMeeting(startTime,durationMinutes,workDay) {
    // ..TODO..
}

scheduleMeeting("07:30",30,workDay);     // true
scheduleMeeting("17:30",30,workDay);     // false
```

If Temporal is missing, still write the types. The exercise is the types.

## `Object.groupBy` Keys

Group these rows by `track`. Then group by the `track` *object* `{ name: "core" }` vs a second `{ name: "core" }`. Predict `Object.groupBy` vs `Map.groupBy` sizes.

```js
var core = { name: "core" };
var rows = [
    { id: 14, track: core },
    { id: 73, track: { name: "core" } }
];
```

## `??` vs `||` Port

`pickPort` from *Types & Grammar* Appendix B: `0` is a valid port. Implement with `??`, then show the one-line `||` version that fails the `0` case.

## Dynamic `import()` Timing

Log `"now"` / `"later"` around `import("./mod.js")` the way Chapter 1 of *Sync & Async* logged timers. Predict: the `import()` call returns a promise *now*; the module evaluates *later*. Static `import` at the top of a module is a different graph.

## Iterator Helper Laziness

Write a generator that `console.log`s each yield. Chain `.map` / `.take(1)` / `.toArray()` vs `[...gen()].map`. Which logs three times? Which logs once?

## Fill A Proposal Card

Pick **one** of: pipes, pattern matching, composites, `using`, iterator helpers. Fill Chapter 1's card (stage, pillar, kind, tonight, delete-by). Paste it as a comment above a userland snippet that solves the problem *without* the proposal.

Once you have code that works, *compare* your solution(s) to the code in "Suggested Solutions" at the end of this appendix.

## Suggested Solutions

Keep in mind that these suggested solutions are just that: suggestions. There are many different ways to solve these practice exercises. Compare your approach to what you see here, and consider the pros and cons of each.

Suggested solution for "Map Keys":

```js
function makeSignIn() {
    var signed = new WeakSet();
    return {
        signIn(person) {
            signed.add(person);
        },
        hasSignedIn(person) {
            return signed.has(person);
        }
    };
}
```

`WeakSet` because the key *is* the object, and you don't want the sign-in log to keep attendees alive after the UI dropped them. `Map` / `Set` would also satisfy the equality test; WeakSet is the leak-aware version. `signed[person.id] = true` on a plain object would treat two different objects with `id: 14` as the same person -- exactly what the last assertion forbids.

----

Suggested solution for "Which Temporal Type?":

1. `Temporal.Instant` -- a point on the timeline; logs shouldn't shift with the reader's time zone.
2. `Temporal.PlainMonthDay` (or `PlainDate` if you also store the year of birth separately) -- a civil date, not an instant.
3. `Temporal.ZonedDateTime` -- civil date + time + IANA zone.
4. `Temporal.Duration` -- a length, not a clock reading.
5. `Temporal.PlainMonthDay` -- recurring month/day.

If you said `ZonedDateTime` for (1) or `Instant` for (2), re-read Chapter 4's "one type for everything is `Date`'s mistake."

Suggested solution for "`?.` How Far?":

```js
function firstCourse(student) {
    if (student == null || typeof student != "object") {
        return "none";
    }
    return student.enrollment?.courses?.[0] ?? "none";
}
```

`?.` handles missing `enrollment` / `courses`. The `typeof` guard refuses to treat `73` as a silent `"none"` -- that's a bug, not a missing field. Six `?.` with no guard is how you hide the bug.

Suggested solution for "`scheduleMeeting` With Temporal":

```js
function scheduleMeeting(startTime,durationMinutes,workDay) {
    var date = Temporal.PlainDate.from(workDay.date);
    var start = Temporal.PlainTime.from(startTime);
    var dayStart = Temporal.PlainTime.from(workDay.start);
    var dayEnd = Temporal.PlainTime.from(workDay.end);

    var meetingStart = date
        .toPlainDateTime(start)
        .toZonedDateTime(workDay.timeZone);
    var meetingEnd = meetingStart.add({
        minutes: durationMinutes
    });
    var workStart = date
        .toPlainDateTime(dayStart)
        .toZonedDateTime(workDay.timeZone);
    var workEnd = date
        .toPlainDateTime(dayEnd)
        .toZonedDateTime(workDay.timeZone);

    return (
        Temporal.ZonedDateTime.compare(
            meetingStart, workStart
        ) >= 0 &&
        Temporal.ZonedDateTime.compare(
            meetingEnd, workEnd
        ) <= 0
    );
}
```

`PlainTime` / `PlainDate` until you mean a Chicago wall clock, then `ZonedDateTime`. `compare`, not millis. `{ minutes }` not `{ days }` for duration. If you used `Date`, redo it.

Suggested solution for "`Object.groupBy` Keys":

`Object.groupBy` ToString's keys -- both tracks become `"[object Object]"`, one group, size 1. `Map.groupBy` keeps identity -- two keys, two groups. Same bug as Chapter 3's two Kyles.

Suggested solution for "`??` vs `||` Port":

```js
function pickPort(config) {
    if (typeof config.port == "number") {
        return config.port;
    }
    return config.port ?? 80;
}

// broken:
// return config.port || 80;   // 0 becomes 80
```

`0 ?? 80` is `0`. `0 || 80` is `80`. That's this book's Chapter 2 in an exercise.

Suggested solution for "Dynamic `import()` Timing":

```js
console.log("now");
var p = import("./mod.js");
console.log("also now", typeof p.then);
p.then(function(){
    console.log("later -- module evaluated");
});
```

The `import()` call returns a promise *now*; the module evaluates *later*. Static `import` at the top of a module is a different graph (load time, not a job you scheduled in this turn).

Suggested solution for "Iterator Helper Laziness":

```js
function* ids() {
    console.log("yield 14");
    yield 14;
    console.log("yield 73");
    yield 73;
    console.log("yield 6");
    yield 6;
}

Iterator.from(ids()).take(1).toArray();
// logs: yield 14

[...ids()].slice(0,1);
// logs all three yields, then slices
```

Helpers pull; spread exhausts. Chapter 3.

Suggested solution for "Fill A Proposal Card":

There is no single sacred card. A passing answer names a real stage (looked up), a real pillar, and a tonight that isn't "ship the plugin" for stage ≤ 2. Example:

```
// feature: pipeline (Hack-style)
// stage: 2 (check tc39/proposals)
// pillar: grammar
// kind: new syntax
// tonight: named vars
// delete-by: stage 4 AND classroomBaseline
var tagged = student.tags ?? [];
var grouped = Object.groupBy(tagged, t => t.track);
```

That's Map keys, Temporal types, stage discipline, `?.` depth, `scheduleMeeting`, groupBy identity, `??` vs `||`, `import()` timing, iterator pull, and a proposal card -- the same try-then-solutions shape as *Get Started* Appendix B, aimed at judgment instead of `scheduleMeeting` strings alone.

A passing Temporal `scheduleMeeting` uses `ZonedDateTime.compare` and `{ minutes }`. A passing sign-in uses `WeakSet` or `WeakMap`, not `obj[person]`. A passing `?.` guard still `typeof`s the student. If you missed those three, re-read Chapters 3--4 before arguing with the solutions.

Keep a tab open on tc39/proposals. That's the real Appendix B for this book, every June.

If `makeSignIn` used `obj[person.id]`, two `{ id: 14 }` objects collapsed. If `scheduleMeeting` used `Date`, DST and "90 minutes" became millis folklore. If `firstCourse(73)` returned `"none"`, you optional-chained a programming error. Three fail-closed checks. Compare your code to the suggestions, then keep the version that names the type.

```js
// fail-closed
log.hasSignedIn({ id: 14, name: "Kyle" });  // false -- not kyleA
scheduleMeeting("17:30",30,workDay);        // false -- compare ZonedDateTime
firstCourse(73);                            // must not silently "none"
```

If all three pass, you practiced the book. If one fails, that's the chapter to re-read -- 3, 4, or 2 -- not a reason to skim the solutions for a paste. *Get Started* Appendix B said compare your approach. Same instruction. Different types.

```js
Iterator.from(ids()).take(1).toArray();
// pull: one yield

[...ids()].slice(0,1);
// exhaust: three yields, then slice
```

That's Chapter 3's laziness drill in two lines. If both logs look the same in your head, you still think iterators are arrays. Spread makes an array. Helpers pull. Don't skip that exercise because Temporal looked bigger.

Stage discipline has no code solution -- a paragraph in the team's README that names stage, pillar, tonight, and delete-by. If tonight is "ship the Babel plugin" for stage 2, rewrite tonight. That's the exercise people skip because it isn't a function. It's the book.

Records/Tuples withdrew (April 2025). Composites are a narrower path. If your card still says "ship Records," update the card -- keep the intern-table snippet. Horizon features die. Userland that named the problem does not. That's Chapter 5 leaking into practice, on purpose.

`import()` returns a promise now; the module evaluates later. If your log put `"later"` between two `"now"`s, collapse. Book 5 Chapter 1, then this drill again. Syntax is not timing.

Keep the tab on tc39/proposals. Fill one card for whatever just jumped a stage the week you read this. If tonight is still userland, you practiced the book. If tonight is a plugin, you practiced a dialect. That's the last compare-your-approach.

A passing card names a real stage you looked up, not a stage you remembered from this PDF. The PDF ages. The habit does not. That's *Get Started* Appendix B's "compare" aimed at June.

Look it up. Then write the tonight snippet. In that order.