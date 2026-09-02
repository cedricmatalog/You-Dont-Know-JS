import { chapterLabel } from "./catalog.js";

export function marbleStatus(state, here = false) {
	if (here && state.done) return "Here, finished";
	if (here) return "Here";
	if (state.done) return "Finished";
	if (state.max > 0) return "Started";
	return "Not started";
}

export function chapterPlace(book, chapterId) {
	const index = book.chapters.findIndex((chapter) => chapter.id === chapterId);
	const chapter = book.chapters[index];
	return {
		index,
		n: index + 1,
		total: book.chapters.length,
		label: chapter ? chapterLabel(chapter) : "Chapter",
		title: chapter?.title ?? "",
	};
}
