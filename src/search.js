import { books, chapterLabel, loadMarkdown } from "./catalog.js";
import { announce, app, esc } from "./dom.js";
import { plainText } from "./markdown.js";

let searchDocs = null;
let searchDocsPromise = null;

export function getSearchDocs() {
	if (searchDocs) return Promise.resolve(searchDocs);
	if (!searchDocsPromise) {
		searchDocsPromise = Promise.all(
			books.flatMap((book) =>
				book.chapters.map(async (chapter) => {
					const md = await loadMarkdown(book.id, chapter.id);
					return {
						book,
						chapter,
						hayTitle: `${book.title} ${chapter.title}`.toLowerCase(),
						text: plainText(md),
					};
				}),
			),
		).then((docs) => {
			searchDocs = docs;
			return docs;
		});
	}
	return searchDocsPromise;
}

export function warmupSearch() {
	if (searchDocs || searchDocsPromise) return;
	const run = () => getSearchDocs();
	if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 4000 });
	else setTimeout(run, 800);
}

export async function runSearch(query) {
	const box = app.querySelector("[data-search-results]");
	if (!box) return;
	const q = query.trim().toLowerCase();
	if (q.length < 2) {
		box.innerHTML = `<p class="search-hint">Type two or more characters. <kbd>?</kbd> lists keys.</p>`;
		return;
	}
	box.innerHTML = `<p class="search-hint">Searching…</p>`;
	const docs = await getSearchDocs();
	const hits = [];
	for (const doc of docs) {
		const idx = doc.text.toLowerCase().indexOf(q);
		if (idx < 0 && !doc.hayTitle.includes(q)) continue;
		const start = Math.max(0, idx < 0 ? 0 : idx - 42);
		const snippet = `${start > 0 ? "…" : ""}${doc.text.slice(start, start + 160)}${start + 160 < doc.text.length ? "…" : ""}`;
		hits.push({ book: doc.book, chapter: doc.chapter, snippet });
		if (hits.length >= 36) break;
	}
	if (!hits.length) {
		box.innerHTML = `<p class="search-hint">No matches for “${esc(query)}”. Try another word or a chapter title.</p>`;
		return;
	}
	box.innerHTML = `<ul class="search-list">${hits
		.map(
			(hit) => `
			<li>
				<a class="search-hit" href="#/${hit.book.id}/${hit.chapter.id}" data-jump="${esc(query.trim())}">
					<small>${esc(hit.book.title)} · ${esc(chapterLabel(hit.chapter))}</small>
					<strong>${esc(hit.chapter.title)}</strong>
					<span>${esc(hit.snippet)}</span>
				</a>
			</li>
		`,
		)
		.join("")}</ul>`;
}

export function revealQuery(query) {
	const prose = app.querySelector("[data-prose]");
	if (!prose || !query) return;
	const needle = query.toLowerCase();
	const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		const node = walker.currentNode;
		const text = node.textContent;
		const at = text.toLowerCase().indexOf(needle);
		if (at < 0) continue;
		const mark = document.createElement("mark");
		mark.className = "search-mark";
		const after = node.splitText(at);
		after.splitText(needle.length);
		mark.appendChild(after);
		node.parentNode.insertBefore(mark, node.nextSibling);
		mark.scrollIntoView({ block: "center" });
		announce(`Jumped to “${query}” in this chapter.`);
		return;
	}
	announce(`Opened the chapter. “${query}” is not in the rendered text.`);
}
