# You Don't Know JS Yet: Sync & Async - 2nd Edition
# Foreword

JS is single-threaded, except when it isn't. It runs to completion, except when you `await`. It has no data races, except when you opt into `SharedArrayBuffer`. Every one of those "except"s is a place a program can look correct and still be wrong *later*.

This book is Book 5 of *You Don't Know JS Yet* because time is not a pillar of the language -- it's the clock the three pillars run on. Closures keep your variables alive across that clock. Promises are objects that reify "not yet." `await` is grammar that yields the turn.

If you've only ever pasted `async` onto functions until the red squiggles went away, start at Chapter 1 anyway. The event loop is not trivia. It is why `setTimeout(fn, 0)` is not the next line of code, why `try..catch` around `readFile` doesn't catch the callback, and why `await` in `forEach` doesn't wait.

Read with a REPL open. Log `"now"` and `"later"` until the order bores you. Then you're ready for the combinators.
