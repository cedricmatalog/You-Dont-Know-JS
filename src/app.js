/* Boot: hash routing, keyboard, render.
 * views.js library/book/reader HTML · chrome.js topbar/overlays
 * search.js index/jump · reader.js scroll/copy · prefs.js theme/type
 * route.js parseRoute · progress.js marbles · styles/ CSS by surface
 */
import "./styles.css";
import { books, getBook, getChapter } from "./catalog.js";
import { bindChrome, closeKeys, closeSearch, openKeys, openSearch, resetOverlayOpeners, setRail, topbar, trapRailTab } from "./chrome.js";
import { app, syncSkip } from "./dom.js";
import { applyPrefs, setReadMenu } from "./prefs.js";
import { bindCopy, bindImages, bindScroll, unbindScroll } from "./reader.js";
import { parseRoute } from "./route.js";
import { warmupSearch } from "./search.js";
import { bookView, libraryView, missingView, readerView } from "./views.js";

function go(hash) {
	if (location.hash === hash) {
		render();
		return;
	}
	location.hash = hash;
}

let renderSeq = 0;

async function render() {
	const seq = ++renderSeq;
	const route = parseRoute();
	syncSkip(route.view);
	unbindScroll();
	setRail(false);
	setReadMenu(false);
	closeKeys();
	document.documentElement.classList.remove("search-open");
	resetOverlayOpeners();
	window.scrollTo(0, 0);
	if (route.view === "book" || route.view === "read" || route.view === "missing") {
		const opening =
			route.view === "book" ? "Opening the book…" : route.view === "read" ? "Opening the chapter…" : "Looking it up…";
		app.innerHTML = `${topbar({ title: opening, view: route.view })}<main id="main" class="missing" tabindex="-1"><p>${opening}</p></main>`;
	}
	if (route.view === "library") app.innerHTML = libraryView();
	else if (route.view === "book") app.innerHTML = await bookView(route.bookId);
	else if (route.view === "missing") app.innerHTML = missingView(route);
	else app.innerHTML = await readerView(route);
	if (seq !== renderSeq) return;
	applyPrefs();
	bindChrome({ onRerender: render });
	bindCopy();
	bindImages();
	const kicker = app.querySelector(".prose > .kicker");
	const heading = app.querySelector(".prose > h1");
	if (kicker && heading) heading.after(kicker);
	if (route.view === "read") bindScroll(route);
	warmupSearch();
	const main = document.getElementById("main");
	main?.focus({ preventScroll: true });
	document.title =
		route.view === "library"
			? "You Don't Know JS Yet"
			: route.view === "book"
				? `${getBook(route.bookId).title} · YDKJSY`
				: route.view === "missing"
					? "Not in this checkout · YDKJSY"
					: `${getChapter(route.bookId, route.chapterId).chapter.title} · YDKJSY`;
}

window.addEventListener("hashchange", render);
window.addEventListener("click", () => setReadMenu(false));
window.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		closeSearch();
		closeKeys();
		setRail(false);
		setReadMenu(false);
		return;
	}
	if (event.key === "Tab" && trapRailTab(event)) return;
	if (event.key === "?" && !event.target.closest("input, textarea")) {
		event.preventDefault();
		openKeys();
		return;
	}
	if ((event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) && !event.target.closest("input, textarea")) {
		event.preventDefault();
		openSearch();
		return;
	}
	if (event.target.closest("input, textarea")) return;
	const route = parseRoute();
	if (route.view !== "read") return;
	const loc = getChapter(route.bookId, route.chapterId);
	if (!loc) return;
	if (event.key === "[") {
		event.preventDefault();
		if (loc.prev) go(`#/${loc.book.id}/${loc.prev.id}`);
		else go(`#/${loc.book.id}`);
		return;
	}
	if (event.key === "]") {
		event.preventDefault();
		if (loc.next) go(`#/${loc.book.id}/${loc.next.id}`);
		else if (loc.book.num < 6) go(`#/${books[loc.book.num].id}`);
		else go("#/");
	}
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyPrefs);

applyPrefs();
render();
