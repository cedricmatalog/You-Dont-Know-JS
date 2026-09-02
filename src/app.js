import "./styles.css";
import {
	books,
	chapterLabel,
	getBook,
	getChapter,
	loadMarkdown,
	readingMinutes,
} from "./catalog.js";
import { extractHeadings, plainText, renderMarkdown } from "./markdown.js";
import { store } from "./store.js";

const app = document.querySelector("#app");
const FONT_STEPS = [0.9, 1, 1.12, 1.28];

function esc(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function parseRoute() {
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

function go(hash) {
	if (location.hash === hash) {
		render();
		return;
	}
	location.hash = hash;
}

function resolvedTheme(theme) {
	if (theme === "night") return "night";
	if (theme === "day") return "day";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function applyPrefs() {
	const prefs = store.get();
	document.documentElement.dataset.theme = resolvedTheme(prefs.theme);
	document.documentElement.style.setProperty("--font-scale", String(prefs.fontScale));
}

function setTheme(theme) {
	store.setTheme(theme);
	applyPrefs();
	syncReadMenu();
}

function marbleStatus(state, here = false) {
	if (here && state.done) return "Here, finished";
	if (here) return "Here";
	if (state.done) return "Finished";
	if (state.max > 0) return "Started";
	return "Not started";
}

function chapterPlace(book, chapterId) {
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

function syncSkip(view) {
	const skip = document.querySelector(".skip-link");
	if (!skip) return;
	skip.textContent =
		view === "read" ? "Skip to chapter" : view === "book" ? "Skip to chapters" : "Skip to library";
}

function fontStepIndex() {
	const index = FONT_STEPS.findIndex((step) => Math.abs(step - store.get().fontScale) < 0.01);
	return index < 0 ? 1 : index;
}

function cycleFont(dir) {
	const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, fontStepIndex() + dir))];
	store.setFontScale(next);
	applyPrefs();
	syncFontButtons();
}

function syncFontButtons() {
	const i = fontStepIndex();
	const dec = app.querySelector('[data-font="-1"]');
	const inc = app.querySelector('[data-font="1"]');
	if (dec) dec.disabled = i <= 0;
	if (inc) inc.disabled = i >= FONT_STEPS.length - 1;
}

function iconMenu() {
	return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

function iconSearch() {
	return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

function readMenuHtml(view) {
	const prefs = store.get();
	const fontIndex = fontStepIndex();
	const hint =
		view === "read"
			? `<p class="read-hint"><kbd>/</kbd> search · <kbd>[</kbd> <kbd>]</kbd> chapters</p>`
			: `<p class="read-hint"><kbd>/</kbd> or <kbd>⌘K</kbd> search</p>`;
	return `
		<div class="read-menu">
			<button class="text-btn" type="button" data-read-menu aria-expanded="false" aria-controls="read-panel" aria-haspopup="true">Read</button>
			<div class="read-panel" id="read-panel" hidden>
				<p class="read-legend" id="type-legend">Type</p>
				<div class="read-row" role="group" aria-labelledby="type-legend">
					<button class="text-btn" type="button" data-font="-1" aria-label="Decrease type size"${fontIndex <= 0 ? " disabled" : ""}>A−</button>
					<button class="text-btn" type="button" data-font="1" aria-label="Increase type size"${fontIndex >= FONT_STEPS.length - 1 ? " disabled" : ""}>A+</button>
				</div>
				<p class="read-legend" id="theme-legend">Theme</p>
				<div class="read-row" role="radiogroup" aria-labelledby="theme-legend">
					<button class="text-btn" type="button" data-theme-set="system" aria-pressed="${prefs.theme === "system"}">Auto</button>
					<button class="text-btn" type="button" data-theme-set="day" aria-pressed="${prefs.theme === "day"}">Day</button>
					<button class="text-btn" type="button" data-theme-set="night" aria-pressed="${prefs.theme === "night"}">Night</button>
				</div>
				${hint}
			</div>
		</div>
	`;
}

function syncReadMenu() {
	const prefs = store.get();
	app.querySelectorAll("[data-theme-set]").forEach((btn) => {
		btn.setAttribute("aria-pressed", btn.dataset.themeSet === prefs.theme ? "true" : "false");
	});
	syncFontButtons();
}

function setReadMenu(open) {
	const panel = app.querySelector("#read-panel");
	const toggle = app.querySelector("[data-read-menu]");
	if (!panel || !toggle) return;
	panel.hidden = !open;
	toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function topbar({ title, bookId, view }) {
	return `
		<header class="topbar">
			<div class="topbar-left">
				${bookId ? `<button class="icon-btn rail-toggle" type="button" data-rail aria-label="Table of contents" aria-expanded="false" aria-controls="toc-rail">${iconMenu()}</button>` : ""}
				<a class="brand" href="#/">
					<span class="brand-mark" aria-hidden="true"></span>
					<span class="brand-name">YDKJS<span>Yet</span></span>
				</a>
			</div>
			<p class="topbar-title">${esc(title)}</p>
			<div class="topbar-right">
				${readMenuHtml(view)}
				<button class="text-btn search-open" type="button" data-search-open aria-expanded="false" aria-controls="search-dialog">${iconSearch()} Search</button>
			</div>
		</header>
	`;
}

function searchModal() {
	return `
		<div class="search" hidden data-search>
			<div class="search-panel" id="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-label">
				<div class="search-bar">
					<label id="search-label" class="sr-only" for="search-input">Search the books</label>
					<input id="search-input" type="search" placeholder="Search all six books…" autocomplete="off" />
					<button type="button" class="text-btn" data-search-close>Close</button>
				</div>
				<div class="search-results" data-search-results aria-live="polite">
					<p class="search-hint">Try <em>closure</em>, <em>coercion</em>, or <em>event loop</em>. <kbd>/</kbd> opens search.</p>
				</div>
			</div>
		</div>
	`;
}

function libraryView() {
	const last = store.get().last;
	const resume = last && getChapter(last.bookId, last.chapterId);
	return `
		${topbar({ title: "Library", view: "library" })}
		<main id="main" class="library" tabindex="-1">
			<header class="masthead">
				<h1>You Don’t Know JS Yet</h1>
				<p class="lede">Six books in this checkout. Open a spine to see its parts.</p>
				${
					resume
						? `<a class="btn btn-primary" href="#/${resume.book.id}/${resume.chapter.id}" aria-label="Continue ${esc(resume.chapter.title)} in ${esc(resume.book.title)}">Continue ${esc(resume.chapter.title)}</a>`
						: ""
				}
			</header>
			<ol class="shelf">
				${books
					.map((book) => {
						const doneRatio = store.bookProgress(book.id, book.chapters.length);
						const doneCount = Math.round(doneRatio * book.chapters.length);
						return `
							<li>
								<a class="spine" href="#/${book.id}" data-book="${book.id}">
									<span class="spine-art" aria-hidden="true"></span>
									<span class="spine-index">${String(book.num).padStart(2, "0")}</span>
									<span class="spine-body">
										<strong>${esc(book.title)}</strong>
										<em>${esc(book.subtitle)}</em>
										<span>${esc(book.blurb)}</span>
									</span>
									<span class="spine-meta">
										<span>${doneCount} of ${book.chapters.length} finished</span>
										<span class="track" aria-hidden="true"><i style="--p:${doneRatio}"></i></span>
									</span>
								</a>
							</li>
						`;
					})
					.join("")}
			</ol>
			<footer class="colophon">
				<p>© 2019–2026 Kyle Simpson. CC BY-NC-ND 4.0. This reader is a local study app for the markdown sources.</p>
			</footer>
		</main>
		${searchModal()}
	`;
}

async function bookView(bookId) {
	const book = getBook(bookId);
	const start = book.chapters[0];
	const doneCount = book.chapters.filter((chapter) => store.chapterState(book.id, chapter.id).done).length;
	const rows = await Promise.all(
		book.chapters.map(async (chapter) => {
			const md = await loadMarkdown(book.id, chapter.id);
			const mins = readingMinutes(md);
			const state = store.chapterState(book.id, chapter.id);
			return `
				<li class="chapter-row">
					<a href="#/${book.id}/${chapter.id}">
						<span class="marble ${state.done ? "is-done" : state.max > 0 ? "is-started" : ""}" aria-hidden="true"></span>
						<span>
							<small>${esc(chapterLabel(chapter))}${chapter.by ? ` · ${esc(chapter.by)}` : ""} · ${esc(marbleStatus(state))}</small>
							<strong>${esc(chapter.title)}</strong>
						</span>
						<span class="mins">${mins} min</span>
					</a>
					${
						state.done
							? `<button class="text-btn unread-btn" type="button" data-unread="${book.id}/${chapter.id}">Mark unread</button>`
							: ""
					}
				</li>
			`;
		}),
	);
	return `
		${topbar({ title: book.title, view: "book" })}
		<main id="main" class="book-page" tabindex="-1">
			<section class="book-hero" data-book="${book.id}">
				<div class="book-cover" aria-hidden="true"><span class="spine-art"></span></div>
				<div>
					<h1>${esc(book.title)}</h1>
					<p class="lede">Book ${book.num} of 6. ${esc(book.blurb)}</p>
					<p class="book-progress">${doneCount} of ${book.chapters.length} finished</p>
					<a class="btn btn-primary" href="#/${book.id}/${start.id}">Open ${esc(start.title)}</a>
				</div>
			</section>
			<ol class="chapter-index">
				${rows.join("")}
			</ol>
		</main>
		${searchModal()}
	`;
}

function missingView(route) {
	if (route.kind === "chapter") {
		const book = getBook(route.bookId);
		return `
			${topbar({ title: "Missing chapter", view: "missing" })}
			<main id="main" class="missing" tabindex="-1">
				<p>No chapter named “${esc(route.attempted)}” in ${esc(book.title)}.</p>
				<p><a href="#/${book.id}">Back to ${esc(book.title)}</a></p>
			</main>
			${searchModal()}
		`;
	}
	return `
		${topbar({ title: "Missing book", view: "missing" })}
		<main id="main" class="missing" tabindex="-1">
			<p>No book named “${esc(route.attempted)}” in this checkout.</p>
			<p><a href="#/">Back to the library</a></p>
		</main>
		${searchModal()}
	`;
}

function railHtml(loc, headings) {
	const { book, chapter } = loc;
	return `
		<aside class="rail" id="toc-rail" data-rail-panel tabindex="-1">
			<a class="rail-book" href="#/${book.id}">${esc(book.title)}</a>
			<nav class="rail-nav" aria-label="Chapters">
				${book.chapters
					.map((item) => {
						const active = item.id === chapter.id;
						const state = store.chapterState(book.id, item.id);
						const kids = active
							? headings
									.map(
										(heading) => `
								<a class="rail-h rail-h${heading.depth}" href="#/${book.id}/${item.id}/${heading.id}">${esc(heading.text)}</a>
							`,
									)
									.join("")
							: "";
						return `
							<div class="rail-item ${active ? "is-active" : ""}">
								<a class="rail-chapter" href="#/${book.id}/${item.id}"${active ? ` aria-current="page"` : ""}>
									<span class="marble ${state.done ? "is-done" : ""} ${active ? "is-here" : ""}" aria-hidden="true"></span>
									<span>
										<small>${esc(chapterLabel(item))} · ${esc(marbleStatus(state, active))}</small>
										${esc(item.title)}
									</span>
								</a>
								${kids}
							</div>
						`;
					})
					.join("")}
			</nav>
		</aside>
	`;
}

async function readerView(route) {
	const loc = getChapter(route.bookId, route.chapterId);
	const markdown = await loadMarkdown(route.bookId, route.chapterId);
	if (!markdown) {
		return `
			${topbar({ title: "Missing chapter", view: "missing" })}
			<main id="main" class="missing" tabindex="-1"><p>This chapter file is missing.</p><a href="#/">Back to the library</a></main>
			${searchModal()}
		`;
	}
	const html = renderMarkdown(markdown, {
		bookId: route.bookId,
		chapterId: route.chapterId,
	});
	const headings = extractHeadings(html);
	const mins = readingMinutes(markdown);
	const prevHref = loc.prev ? `#/${loc.book.id}/${loc.prev.id}` : `#/${loc.book.id}`;
	const nextHref = loc.next
		? `#/${loc.book.id}/${loc.next.id}`
		: loc.book.num < 6
			? `#/${books[loc.book.num].id}`
			: "#/";
	const nextLabel = loc.next
		? loc.next.title
		: loc.book.num < 6
			? `Next book: ${books[loc.book.num].title}`
			: "Back to the library";

	const place = chapterPlace(loc.book, loc.chapter.id);
	const done = store.chapterState(loc.book.id, loc.chapter.id).done;
	const barTitle = `${loc.book.title} · ${place.label}`;

	return `
		${topbar({ title: barTitle, bookId: loc.book.id, view: "read" })}
		<div class="reader-progress">
			<div
				class="progress-meter"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow="0"
				aria-label="Reading position in ${esc(loc.chapter.title)}"
				data-progress-meter
			>
				<i data-progress></i>
			</div>
			<p class="progress-status" data-progress-status>${esc(place.label)} · ${place.n} of ${place.total}</p>
		</div>
		<div class="workspace">
			${railHtml(loc, headings)}
			<div class="scrim" data-rail-close hidden></div>
			<main id="main" class="reader" data-book="${loc.book.id}" tabindex="-1">
				<article class="prose" data-prose>
					<p class="kicker">${esc(place.label)} · ${mins} min read · ${place.n} of ${place.total}</p>
					${html}
					<p class="unread-wrap"${done ? "" : " hidden"}><button class="text-btn" type="button" data-unread="${loc.book.id}/${loc.chapter.id}">Mark unread</button></p>
				</article>
				<nav class="pager" aria-label="Adjacent chapters">
					<a href="${prevHref}">${loc.prev ? `← ${esc(loc.prev.title)}` : `← ${esc(loc.book.title)}`}</a>
					<a href="${nextHref}">${esc(nextLabel)} →</a>
				</nav>
			</main>
		</div>
		${searchModal()}
	`;
}

function bindCopy() {
	app.querySelectorAll("[data-copy]").forEach((button) => {
		button.addEventListener("click", async () => {
			const code = button.closest(".code-block")?.querySelector("code")?.innerText ?? "";
			clearTimeout(Number(button.dataset.copyTimer));
			try {
				await navigator.clipboard.writeText(code);
				button.textContent = "Copied";
			} catch {
				button.textContent = "Select to copy";
			}
			button.dataset.copyTimer = String(
				setTimeout(() => {
					button.textContent = "Copy";
				}, 1400),
			);
		});
	});
}

function bindImages() {
	app.querySelectorAll(".prose img").forEach((img) => {
		img.addEventListener("error", () => {
			if (!img.dataset.fallback && /\.png($|\?)/i.test(img.src)) {
				img.dataset.fallback = "svg";
				img.src = img.src.replace(/\.png($|\?)/i, ".svg$1");
				return;
			}
			img.classList.add("is-missing");
			const figure = img.closest("figure");
			if (figure && !figure.querySelector(".missing-fig")) {
				const note = document.createElement("p");
				note.className = "missing-fig";
				note.textContent = "This figure is missing from the book files.";
				img.insertAdjacentElement("afterend", note);
			}
		});
	});
}

let scrollCleanup = null;

function bindScroll(route) {
	scrollCleanup?.();
	const bar = app.querySelector("[data-progress]");
	const meter = app.querySelector("[data-progress-meter]");
	const status = app.querySelector("[data-progress-status]");
	if (!bar) return;
	const loc = getChapter(route.bookId, route.chapterId);
	const place = loc ? chapterPlace(loc.book, loc.chapter.id) : null;
	let persistTimer = 0;
	let lastRatio = 0;
	let ready = false;
	unreadHold = false;
	const persist = (ratio) => {
		store.setLast(route.bookId, route.chapterId, ratio);
		store.setChapterProgress(route.bookId, route.chapterId, ratio, { allowDone: !unreadHold });
	};
	const paint = (ratio) => {
		lastRatio = ratio;
		bar.style.transform = `scaleX(${ratio})`;
		if (meter) {
			meter.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
		}
		if (status && place) {
			status.textContent = `${place.label} · ${place.n} of ${place.total} · ${Math.round(ratio * 100)}%`;
		}
		const done = unreadHold
			? false
			: ratio >= 0.92 || store.chapterState(route.bookId, route.chapterId).done;
		app.querySelectorAll(".rail-item.is-active .marble").forEach((el) => {
			el.classList.toggle("is-done", done);
		});
		const unread = app.querySelector(".unread-wrap");
		if (unread) unread.hidden = !done;
	};
	const onScroll = () => {
		const max = document.documentElement.scrollHeight - window.innerHeight;
		const ratio = max <= 0 ? 1 : Math.min(1, window.scrollY / max);
		paint(ratio);
		if (!ready) return;
		clearTimeout(persistTimer);
		persistTimer = window.setTimeout(() => persist(ratio), 200);
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	const last = store.get().last;
	const restore =
		!route.heading &&
		last &&
		last.bookId === route.bookId &&
		last.chapterId === route.chapterId &&
		last.scroll > 0.02;
	if (route.heading) {
		const target = document.getElementById(route.heading);
		if (target) target.scrollIntoView();
	} else if (restore) {
		const max = document.documentElement.scrollHeight - window.innerHeight;
		if (max > 0) window.scrollTo(0, last.scroll * max);
	}
	onScroll();
	ready = true;
	scrollCleanup = () => {
		window.removeEventListener("scroll", onScroll);
		clearTimeout(persistTimer);
		persist(lastRatio);
		scrollCleanup = null;
	};
}

let searchOpener = null;
let railOpener = null;
let unreadHold = false;

function railIsDrawer() {
	return window.matchMedia("(max-width: 980px)").matches;
}

function railFocusables() {
	const rail = app.querySelector("[data-rail-panel]");
	if (!rail) return [];
	return [...rail.querySelectorAll("a[href], button:not([disabled])")].filter((el) => !el.hidden);
}

function trapRailTab(event) {
	if (!document.documentElement.classList.contains("rail-open") || !railIsDrawer()) return false;
	const toggle = app.querySelector("[data-rail]");
	const items = [...(toggle ? [toggle] : []), ...railFocusables()];
	if (!items.length) return false;
	const first = items[0];
	const last = items[items.length - 1];
	if (!items.includes(document.activeElement)) {
		event.preventDefault();
		first.focus();
		return true;
	}
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
		return true;
	}
	if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
		return true;
	}
	return false;
}

function searchFocusables(root) {
	return [...root.querySelectorAll("a[href], button:not([disabled]), input")].filter(
		(el) => !el.hidden && el.getAttribute("aria-hidden") !== "true",
	);
}

function openSearch() {
	const root = app.querySelector("[data-search]");
	if (!root) return;
	if (document.documentElement.classList.contains("rail-open")) {
		railOpener = null;
		setRail(false);
	}
	setReadMenu(false);
	searchOpener = document.activeElement;
	root.hidden = false;
	document.documentElement.classList.add("search-open");
	app.querySelector("[data-search-open]")?.setAttribute("aria-expanded", "true");
	const input = root.querySelector("input");
	input.focus();
	input.select();
}

function closeSearch() {
	const root = app.querySelector("[data-search]");
	if (!root || root.hidden) return;
	root.hidden = true;
	document.documentElement.classList.remove("search-open");
	app.querySelector("[data-search-open]")?.setAttribute("aria-expanded", "false");
	if (searchOpener && typeof searchOpener.focus === "function") searchOpener.focus();
	searchOpener = null;
}

let searchDocs = null;
let searchDocsPromise = null;

function getSearchDocs() {
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

function warmupSearch() {
	if (searchDocs || searchDocsPromise) return;
	const run = () => getSearchDocs();
	if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 4000 });
	else setTimeout(run, 800);
}

async function runSearch(query) {
	const box = app.querySelector("[data-search-results]");
	if (!box) return;
	const q = query.trim().toLowerCase();
	if (q.length < 2) {
		box.innerHTML = `<p class="search-hint">Type two or more characters.</p>`;
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
				<a class="search-hit" href="#/${hit.book.id}/${hit.chapter.id}">
					<small>${esc(hit.book.title)} · ${esc(chapterLabel(hit.chapter))}</small>
					<strong>${esc(hit.chapter.title)}</strong>
					<span>${esc(hit.snippet)}</span>
				</a>
			</li>
		`,
		)
		.join("")}</ul>`;
}

function setRail(open) {
	const drawer = railIsDrawer();
	document.documentElement.classList.toggle("rail-open", open);
	const scrim = app.querySelector("[data-rail-close]");
	if (scrim) scrim.hidden = !open;
	app.querySelector("[data-rail]")?.setAttribute("aria-expanded", open ? "true" : "false");
	const reader = app.querySelector(".reader");
	if (reader) {
		if (open && drawer) reader.setAttribute("inert", "");
		else reader.removeAttribute("inert");
	}
	if (open && drawer) {
		railOpener = document.activeElement;
		const first = railFocusables()[0];
		(first ?? app.querySelector("[data-rail-panel]"))?.focus();
	} else if (!open) {
		if (drawer && railOpener && typeof railOpener.focus === "function") railOpener.focus();
		railOpener = null;
	}
}

function bindChrome() {
	app.querySelectorAll("[data-theme-set]").forEach((btn) => {
		btn.addEventListener("click", () => setTheme(btn.dataset.themeSet));
	});
	app.querySelectorAll("[data-font]").forEach((btn) => {
		btn.addEventListener("click", () => cycleFont(Number(btn.dataset.font)));
	});
	syncReadMenu();
	app.querySelector("[data-read-menu]")?.addEventListener("click", (event) => {
		event.stopPropagation();
		const panel = app.querySelector("#read-panel");
		setReadMenu(Boolean(panel?.hidden));
	});
	app.querySelector("#read-panel")?.addEventListener("click", (event) => event.stopPropagation());
	app.querySelector("[data-search-open]")?.addEventListener("click", openSearch);
	app.querySelector("[data-search-close]")?.addEventListener("click", closeSearch);
	app.querySelectorAll("[data-unread]").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const [bookId, chapterId] = btn.dataset.unread.split("/");
			store.setChapterUnread(bookId, chapterId);
			const route = parseRoute();
			if (route.view === "book") {
				render();
				return;
			}
			unreadHold = true;
			app.querySelector(".unread-wrap")?.setAttribute("hidden", "");
			app.querySelector(".rail-item.is-active .marble")?.classList.remove("is-done");
			const loc = getChapter(bookId, chapterId);
			const small = app.querySelector(".rail-item.is-active small");
			if (small && loc) {
				small.textContent = `${chapterLabel(loc.chapter)} · ${marbleStatus({ max: 0, done: false }, true)}`;
			}
		});
	});
	const searchRoot = app.querySelector("[data-search]");
	searchRoot?.addEventListener("click", (event) => {
		if (event.target.matches("[data-search]")) closeSearch();
	});
	searchRoot?.addEventListener("keydown", (event) => {
		if (event.key !== "Tab" || !searchRoot || searchRoot.hidden) return;
		const items = searchFocusables(searchRoot);
		if (!items.length) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	});
	const input = app.querySelector("#search-input");
	if (input) {
		let timer;
		let searchSeq = 0;
		input.addEventListener("input", () => {
			clearTimeout(timer);
			const q = input.value;
			timer = setTimeout(async () => {
				const seq = ++searchSeq;
				await runSearch(q);
				if (seq !== searchSeq) return;
			}, 120);
		});
	}
	app.querySelector("[data-rail]")?.addEventListener("click", () => {
		setRail(!document.documentElement.classList.contains("rail-open"));
	});
	app.querySelector("[data-rail-close]")?.addEventListener("click", () => setRail(false));
	app.querySelectorAll(".rail a").forEach((link) => {
		link.addEventListener("click", () => setRail(false));
	});
}

let renderSeq = 0;

async function render() {
	const seq = ++renderSeq;
	const route = parseRoute();
	syncSkip(route.view);
	scrollCleanup?.();
	setRail(false);
	setReadMenu(false);
	document.documentElement.classList.remove("search-open");
	searchOpener = null;
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
	bindChrome();
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
		setRail(false);
		setReadMenu(false);
		return;
	}
	if (event.key === "Tab" && trapRailTab(event)) return;
	if ((event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) && !event.target.closest("input, textarea")) {
		event.preventDefault();
		openSearch();
		return;
	}
	if (event.target.closest("input, textarea")) return;
	const route = parseRoute();
	if (route.view !== "read") return;
	const loc = getChapter(route.bookId, route.chapterId);
	if (event.key === "[" && loc.prev) go(`#/${loc.book.id}/${loc.prev.id}`);
	if (event.key === "]" && loc.next) go(`#/${loc.book.id}/${loc.next.id}`);
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyPrefs);

applyPrefs();
render();
