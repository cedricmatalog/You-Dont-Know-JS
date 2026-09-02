# You Don't Know JS Yet: Sync & Async - 2nd Edition

## Table of Contents

* Foreword
* Preface
* Chapter 1: Now & Later
    * About This Book
    * Chunks, Not A Straight Road
    * Sync Means Now
    * Async Means Later
        * See The Request
    * The Event Loop
        * Jobs Can Queue Jobs
        * Nested Jobs Starve Paint
    * Concurrency Is Not Parallelism
    * Time Is A Hidden Input
    * Now, Then Later
* Chapter 2: Callbacks
    * Sync Callbacks vs Async Callbacks
    * Nesting, Or "Callback Hell"
        * See The Pyramid
    * Inversion Of Control
    * Error-First And The Two Channels
    * Once, Always Later
    * Events Are Callbacks With A Name
    * Thunks
    * What Callbacks Are Still For
* Chapter 3: Promises
    * From `printSummary` To A Promise Chain
    * Three States, One Outcome
    * Thenables And `.then(..)`
    * Errors Fall Until Caught
    * Combinators
        * Combinator Error Semantics
    * Thenables That Aren't Promises
    * Sync-Looking Lies
    * Cancellation Is Not A Promise State
    * Promises Are Values
        * See The Chain
        * `finally` Passes Through
        * The Explicit Promise Construction Antipattern
* Chapter 4: Iterators & Generators
    * The Iterator Protocol
    * Generators: Functions You Can Pause
    * Generators As State Machines
    * Pushing Async Through A Generator
    * Async Iterators
    * Iterators Are Pull, Events Are Push
    * Students As An Iterable
        * See The Pause
        * `break` Still Calls `.return()`
* Chapter 5: Async / Await
    * `printSummary` At Last Looks Like Sync
    * `async` Functions Return Promises
    * `await` Unwraps Thenables
        * Errors Across `await` Boundaries
        * `await` In `catch` And `finally`
    * Sequential By Default, Concurrent By Choice
        * See The `forEach` Bug
    * `await` Is Not Allowed Everywhere
    * Microtasks And "It Still Interleaves"
    * `async` Methods And `this`
    * Don't `async` Everything
    * Cancellation At The `await`
    * Top-Level `await` Is Still A Job
    * What The Compiler Wrote
    * `await` Using And Resources
    * The Shape Of A Program
* Chapter 6: Concurrent JS
    * Scheduling Against The Frame
        * See The Frame
    * Workers: Another Heap, Another Loop
        * A Protocol, Not A Firehose
        * Dedicated, Shared, Service
        * `MessageChannel`
    * Structured Clone And Transfer
    * Shared Memory And Atomics
        * See The Race
    * Node: The Same Loop, Different Host
    * Cancellation As A System
        * Worker Errors Are Another Channel
        * A Tiny Pool
    * See The Offload
        * What If Parse Fails?
        * Late Messages
        * When Not To Worker
        * The Clone Is Still Now
        * Two Loops, One User
    * A Closing Model
* Appendix A: Exploring Further
    * Thenable Assimilation And Thenable Worms
    * Unhandled Rejections
    * `async` Stack Traces
    * Testing Time
    * Observables
    * `queueMicrotask` vs `Promise.resolve().then`
    * `fetch` Is Still Promises Plus A Host
    * `setTimeout` Is Not A Clock
    * `fs` And Other Hosts Still Run To Completion
    * Thenable Worms, With A Classroom DTO
    * Unhandled Rejection Is A Turn Too Late
    * Fake Timers And Two Queues
    * `scheduler.postTask` And Priorities
    * `Promise.try` And Mixed Sync Throws
    * `requestAnimationFrame` Is Not `setTimeout(16)`
    * Multiple Listeners, One `abort`
    * Node `unhandledRejection` vs The Browser
    * `queueMicrotask` In A Worker
    * `isTrusted` And Synthetic Events
    * `await` In `finally` Can Replace The Error
    * `Promise.all` Does Not Cancel The Losers
    * `async` Stacks And `cause`
    * `for await` Of A Sync Iterable
    * `queueMicrotask` Recursion Cap
    * `MessageChannel` As A Task
    * `node:fs` Parse Is Still Now
    * `AbortSignal.timeout`
* Appendix B: Practice
    * Predicting The Loop
    * `fetchStudent` Without Zalgo
    * Classroom Loader
    * Two Summaries, One Turn
    * Microtask Flood
    * `Promise.all` Order
    * Abort The Loader
    * Suggested Solutions
* Thank You!
