import { getBook, getChapter } from "./catalog.js";

export function parseRoute() {
	const path = location.hash.replace(/^#\/?/, "");
	if (!path) return { view: "library" };
	const parts = path.split("/").filter(Boolean);
	const book = getBook(parts[0]);
	if (!book) return { view: "missing", kind: "book", attempted: parts[0] };
	if (parts.length === 1) return { view: "book", bookId: book.id };
	const loc = getChapter(book.id, parts[1]);
	if (!loc) return { view: "missing", kind: "chapter", bookId: book.id, attempted: parts[1] };
	return {
		view: "read",
		bookId: book.id,
		chapterId: loc.chapter.id,
		heading: parts.slice(2).join("/") || null,
	};
}
