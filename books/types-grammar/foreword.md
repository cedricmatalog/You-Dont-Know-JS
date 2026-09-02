# You Don't Know JS Yet: Types & Grammar - 2nd Edition
# Foreword

Books 1–3 opened with guest essays. This title had no first-edition guest to reprint, so the note is mine.

Types are the values. Grammar is how we write the operations that move those values around. Most JS developers are asked to pick a side: either obsess over types (usually by installing a type *checker* and then ignoring the language's own conversions) or obsess over syntax style (semicolons, `const` vs `let`, which bundler template to clone) and treat the type system as a pile of warts to lint away.

This book refuses that split.

JS already has types. They live on values, not on variables. JS already has coercions. Some of them are excellent, some of them are sharp, and almost none of them are optional if you want to understand what `if (x)`, `x + y`, or `x == y` actually do. JS already has a grammar, including the parts people meme about -- ASI, `typeof null`, `switch` and `===` -- that stop being folklore the moment you read the productions.

If you came here hoping for a blessing to never think about `==` again, you will be disappointed. If you came here hoping to finally own the third pillar of the language -- the one *Get Started* warned you not to skip -- you're in the right place.

Take it slowly. The earlier chapters on primitives look "basic" until they aren't. The coercion chapter will pick a fight with some of your tools. The grammar chapter will pick a fight with some of your style guides. That's the point. You don't know JS yet. But you can.

Kyle Simpson<br>
Author, *You Don't Know JS Yet*
