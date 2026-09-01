export const books = [
	{
		id: "get-started",
		num: 1,
		title: "Get Started",
		subtitle: "First steps, then the three pillars",
		blurb: "What JavaScript is, how it is specified, and a survey of the language before you go deeper.",
		chapters: [
			{ id: "foreword", title: "Foreword", by: "Brian Holt" },
			{ id: "preface", title: "Preface" },
			{ id: "ch1", title: "What Is JavaScript?" },
			{ id: "ch2", title: "Surveying JS" },
			{ id: "ch3", title: "Digging to the Roots of JS" },
			{ id: "ch4", title: "The Bigger Picture" },
			{ id: "apA", title: "Exploring Further" },
			{ id: "apB", title: "Practice, Practice, Practice!" },
		],
	},
	{
		id: "scope-closures",
		num: 2,
		title: "Scope & Closures",
		subtitle: "Marbles, buckets, and lexical hiding",
		blurb: "How JS decides where variables live, how nested scopes work, and why closures are not a trick.",
		chapters: [
			{ id: "foreword", title: "Foreword", by: "Sarah Drasner" },
			{ id: "preface", title: "Preface" },
			{ id: "ch1", title: "What's the Scope?" },
			{ id: "ch2", title: "Illustrating Lexical Scope" },
			{ id: "ch3", title: "The Scope Chain" },
			{ id: "ch4", title: "Around the Global Scope" },
			{ id: "ch5", title: "The (Not So) Secret Lifecycle of Variables" },
			{ id: "ch6", title: "Limiting Scope Exposure" },
			{ id: "ch7", title: "Using Closures" },
			{ id: "ch8", title: "The Module Pattern" },
			{ id: "apA", title: "Exploring Further" },
			{ id: "apB", title: "Practice" },
		],
	},
	{
		id: "objects-classes",
		num: 3,
		title: "Objects & Classes",
		subtitle: "Prototypes, this, and delegation",
		blurb: "Objects as containers, how [[Prototype]] actually links, class syntax, and this at the call site.",
		chapters: [
			{ id: "foreword", title: "Foreword", by: "Rick Waldron" },
			{ id: "preface", title: "Preface" },
			{ id: "ch1", title: "Object Foundations" },
			{ id: "ch2", title: "How Objects Work" },
			{ id: "ch3", title: "Classy Objects" },
			{ id: "ch4", title: "This Works" },
			{ id: "ch5", title: "Delegation" },
			{ id: "apA", title: "\"Inheritance\" Objections" },
			{ id: "apB", title: "Prototypal Classes & Protected Visibility" },
			{ id: "apC", title: "Practice" },
			{ id: "thanks", title: "Thank You!" },
		],
	},
	{
		id: "types-grammar",
		num: 4,
		title: "Types & Grammar",
		subtitle: "Values, coercion, and how the parser sees you",
		blurb: "Primitives versus objects, the real coercion table, and the grammar that makes programs parse.",
		chapters: [
			{ id: "foreword", title: "Foreword" },
			{ id: "preface", title: "Preface" },
			{ id: "ch1", title: "Primitive Values" },
			{ id: "ch2", title: "Primitive Behaviors" },
			{ id: "ch3", title: "Object Values" },
			{ id: "ch4", title: "Coercing Values" },
			{ id: "ch5", title: "Grammar" },
			{ id: "apA", title: "Exploring Further" },
			{ id: "apB", title: "Practice" },
			{ id: "thanks", title: "Thank You!" },
		],
	},
	{
		id: "sync-async",
		num: 5,
		title: "Sync & Async",
		subtitle: "Now, later, and the event loop",
		blurb: "Callbacks, promises, generators, async/await, and concurrent JS — one loop, many later turns.",
		chapters: [
			{ id: "foreword", title: "Foreword" },
			{ id: "preface", title: "Preface" },
			{ id: "ch1", title: "Now & Later" },
			{ id: "ch2", title: "Callbacks" },
			{ id: "ch3", title: "Promises" },
			{ id: "ch4", title: "Iterators & Generators" },
			{ id: "ch5", title: "Async / Await" },
			{ id: "ch6", title: "Concurrent JS" },
			{ id: "apA", title: "Exploring Further" },
			{ id: "apB", title: "Practice" },
			{ id: "thanks", title: "Thank You!" },
		],
	},
	{
		id: "es-next-beyond",
		num: 6,
		title: "ES.Next & Beyond",
		subtitle: "The moving target, without drowning",
		blurb: "How TC39 ships yearly JS, what has already landed, Temporal, and how to watch the horizon.",
		chapters: [
			{ id: "foreword", title: "Foreword" },
			{ id: "preface", title: "Preface" },
			{ id: "ch1", title: "The Moving Target" },
			{ id: "ch2", title: "Syntax We've Absorbed" },
			{ id: "ch3", title: "Collections, Iteration, And APIs" },
			{ id: "ch4", title: "Temporal" },
			{ id: "ch5", title: "The Horizon" },
			{ id: "apA", title: "Exploring Further" },
			{ id: "apB", title: "Practice" },
			{ id: "thanks", title: "Thank You!" },
		],
	},
];

export const sources = import.meta.glob(
	[
		"../preface.md",
		"../get-started/{foreword,ch1,ch2,ch3,ch4,apA,apB}.md",
		"../scope-closures/{foreword,ch1,ch2,ch3,ch4,ch5,ch6,ch7,ch8,apA,apB}.md",
		"../objects-classes/{foreword,ch1,ch2,ch3,ch4,ch5,apA,apB,apC,thanks}.md",
		"../types-grammar/{foreword,ch1,ch2,ch3,ch4,ch5,apA,apB,thanks}.md",
		"../sync-async/{foreword,ch1,ch2,ch3,ch4,ch5,ch6,apA,apB,thanks}.md",
		"../es-next-beyond/{foreword,ch1,ch2,ch3,ch4,ch5,apA,apB,thanks}.md",
	],
	{ query: "?raw", import: "default" },
);

const cache = new Map();

function findLoader(suffix) {
	return Object.entries(sources).find(([key]) => key.endsWith(suffix))?.[1];
}

export function getBook(id) {
	return books.find((book) => book.id === id);
}

export function getChapter(bookId, chapterId) {
	const book = getBook(bookId);
	if (!book) return null;
	const index = book.chapters.findIndex((chapter) => chapter.id === chapterId);
	if (index < 0) return null;
	return {
		book,
		chapter: book.chapters[index],
		index,
		prev: book.chapters[index - 1] ?? null,
		next: book.chapters[index + 1] ?? null,
	};
}

export async function loadMarkdown(bookId, chapterId) {
	const key = chapterId === "preface" ? "preface.md" : `${bookId}/${chapterId}.md`;
	if (cache.has(key)) return cache.get(key);
	const loader = findLoader(key);
	const markdown = loader ? await loader() : "";
	cache.set(key, markdown);
	return markdown;
}

export function chapterKind(id) {
	if (id === "foreword") return "foreword";
	if (id === "preface") return "preface";
	if (id === "thanks") return "thanks";
	if (id.startsWith("ap")) return "appendix";
	return "chapter";
}

export function chapterLabel(chapter) {
	const kind = chapterKind(chapter.id);
	if (kind === "chapter") {
		const n = chapter.id.replace("ch", "");
		return `Chapter ${n}`;
	}
	if (kind === "appendix") {
		return `Appendix ${chapter.id.slice(2)}`;
	}
	return kind === "foreword" ? "Foreword" : kind === "preface" ? "Preface" : "Thanks";
}

export function readingMinutes(markdown) {
	const words = markdown.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}

export function firstReadableChapter(book) {
	return book.chapters.find((chapter) => chapter.id.startsWith("ch")) ?? book.chapters[0];
}
