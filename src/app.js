import "./styles.css";
import {
	books,
	chapterLabel,
	firstReadableChapter,
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
	if (!book) return { view: "library" };
	if (parts.length === 1) return { view: "book", bookId: book.id };
	const loc = getChapter(book.id, parts[1]);
	if (!loc) return { view: "book", bookId: book.id };
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

function cycleTheme() {
	const order = ["system", "day", "night"];
	const current = store.get().theme;
	const next = order[(order.indexOf(current) + 1) % order.length];
	store.setTheme(next);
	applyPrefs();
	const btn = app.querySelector("[data-theme-toggle]");
	if (btn) {
		btn.textContent = themeLabel(next);
		btn.setAttribute("aria-label", `Theme: ${themeLabel(next)}`);
	}
}

function themeLabel(theme) {
	if (theme === "night") return "Night";
	if (theme === "day") return "Day";
	return "Auto";
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

function topbar({ title, back, bookId }) {
	const prefs = store.get();
	const fontIndex = fontStepIndex();
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
				<button class="text-btn" type="button" data-font="-1" aria-label="Decrease type size"${fontIndex <= 0 ? " disabled" : ""}>A−</button>
				<button class="text-btn" type="button" data-font="1" aria-label="Increase type size"${fontIndex >= FONT_STEPS.length - 1 ? " disabled" : ""}>A+</button>
				<button class="text-btn" type="button" data-theme-toggle aria-label="Theme: ${themeLabel(prefs.theme)}">${themeLabel(prefs.theme)}</button>
				<button class="icon-btn" type="button" data-search-open aria-label="Search" aria-expanded="false" aria-controls="search-dialog">${iconSearch()}</button>
			</div>
		</header>
		${back ? `<div class="sr-only">${esc(back)}</div>` : ""}
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
				<div class="search-results" data-search-results>
					<p class="search-hint">Try <em>closure</em>, <em>coercion</em>, or <em>event loop</em>.</p>
				</div>
			</div>
		</div>
	`;
}

function libraryView() {
	const last = store.get().last;
	const resume = last && getChapter(last.bookId, last.chapterId);
	return `
		${topbar({ title: "Library" })}
		<main id="main" class="library">
			<section class="hero">
				<p class="eyebrow">Second edition · six books · the language itself</p>
				<h1>
					You don’t<br />know JS
					<em>yet.</em>
				</h1>
				<p class="lede">
					Kyle Simpson’s series is a challenge, not a tutorial: set aside what you assume
					about JavaScript and ask <em>why</em> for every line you write.
				</p>
				<div class="hero-actions">
					${
						resume
							? `<a class="btn btn-primary" href="#/${resume.book.id}/${resume.chapter.id}">Continue ${esc(resume.book.title)}</a>`
							: `<a class="btn btn-primary" href="#/get-started/ch1">Start with Get Started</a>`
					}
					<a class="btn btn-ghost" href="#/get-started">Browse the shelf</a>
				</div>
			</section>
			<ol class="shelf">
				${books
					.map((book) => {
						const done = store.bookProgress(book.id, book.chapters.length);
						const start = firstReadableChapter(book);
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
										<span>${book.chapters.length} parts</span>
										<span class="track"><i style="--p:${done}"></i></span>
									</span>
								</a>
								<a class="spine-read" href="#/${book.id}/${start.id}">Read</a>
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
	const start = firstReadableChapter(book);
	const rows = await Promise.all(
		book.chapters.map(async (chapter) => {
			const md = await loadMarkdown(book.id, chapter.id);
			const mins = readingMinutes(md);
			const state = store.chapterState(book.id, chapter.id);
			return `
				<li>
					<a href="#/${book.id}/${chapter.id}">
						<span class="marble ${state.done ? "is-done" : ""}" aria-hidden="true"></span>
						<span>
							<small>${esc(chapterLabel(chapter))}${chapter.by ? ` · ${esc(chapter.by)}` : ""}</small>
							<strong>${esc(chapter.title)}</strong>
						</span>
						<span class="mins">${mins} min</span>
					</a>
				</li>
			`;
		}),
	);
	return `
		${topbar({ title: book.title })}
		<main id="main" class="book-page">
			<section class="book-hero" data-book="${book.id}">
				<div class="book-cover" aria-hidden="true"><span class="spine-art"></span></div>
				<div>
					<p class="eyebrow">Book ${book.num} of 6</p>
					<h1>${esc(book.title)}</h1>
					<p class="lede">${esc(book.blurb)}</p>
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

function railHtml(loc, headings) {
	const { book, chapter } = loc;
	return `
		<aside class="rail" id="toc-rail" data-rail-panel>
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
								<a class="rail-chapter" href="#/${book.id}/${item.id}">
									<span class="marble ${state.done ? "is-done" : ""} ${active ? "is-here" : ""}"></span>
									<span>
										<small>${esc(chapterLabel(item))}</small>
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
			${topbar({ title: "Missing chapter" })}
			<main id="main" class="missing"><p>That chapter is not in this checkout.</p><a href="#/">Back to library</a></main>
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
			: "Back to library";

	return `
		${topbar({ title: loc.book.title, bookId: loc.book.id })}
		<div class="reader-progress" aria-hidden="true"><i data-progress></i></div>
		<div class="workspace">
			${railHtml(loc, headings)}
			<div class="scrim" data-rail-close hidden></div>
			<main id="main" class="reader" data-book="${loc.book.id}">
				<article class="prose" data-prose>
					<p class="kicker">${esc(chapterLabel(loc.chapter))} · ${mins} min read</p>
					${html}
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
			try {
				await navigator.clipboard.writeText(code);
				button.textContent = "Copied";
			} catch {
				button.textContent = "Select to copy";
			}
			setTimeout(() => {
				button.textContent = "Copy";
			}, 1400);
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
				note.textContent = "Figure file is not in this checkout.";
				img.insertAdjacentElement("afterend", note);
			}
		});
	});
}

function bindScroll(route) {
	const bar = app.querySelector("[data-progress]");
	if (!bar) return;
	const onScroll = () => {
		const max = document.documentElement.scrollHeight - window.innerHeight;
		const ratio = max <= 0 ? 1 : Math.min(1, window.scrollY / max);
		bar.style.transform = `scaleX(${ratio})`;
		store.setLast(route.bookId, route.chapterId, ratio);
		store.setChapterProgress(route.bookId, route.chapterId, ratio);
		const marbles = app.querySelectorAll(".rail-item.is-active .marble");
		marbles.forEach((el) => el.classList.toggle("is-done", ratio >= 0.92));
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	onScroll();
	if (route.heading) {
		const target = document.getElementById(route.heading);
		if (target) target.scrollIntoView();
	}
}

let searchOpener = null;

function searchFocusables(root) {
	return [...root.querySelectorAll("a[href], button:not([disabled]), input")].filter(
		(el) => !el.hidden && el.getAttribute("aria-hidden") !== "true",
	);
}

function openSearch() {
	const root = app.querySelector("[data-search]");
	if (!root) return;
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

async function runSearch(query) {
	const box = app.querySelector("[data-search-results]");
	if (!box) return;
	const q = query.trim().toLowerCase();
	if (q.length < 2) {
		box.innerHTML = `<p class="search-hint">Type at least two characters.</p>`;
		return;
	}
	box.innerHTML = `<p class="search-hint">Searching…</p>`;
	const hits = [];
	outer: for (const book of books) {
		for (const chapter of book.chapters) {
			const md = await loadMarkdown(book.id, chapter.id);
			const hayTitle = `${book.title} ${chapter.title}`.toLowerCase();
			const text = plainText(md);
			const idx = text.toLowerCase().indexOf(q);
			if (idx < 0 && !hayTitle.includes(q)) continue;
			const start = Math.max(0, idx < 0 ? 0 : idx - 42);
			const snippet = `${start > 0 ? "…" : ""}${text.slice(start, start + 160)}${start + 160 < text.length ? "…" : ""}`;
			hits.push({ book, chapter, snippet });
			if (hits.length >= 36) break outer;
		}
	}
	if (!hits.length) {
		box.innerHTML = `<p class="search-hint">No matches for “${esc(query)}”.</p>`;
		return;
	}
	box.innerHTML = hits
		.map(
			(hit) => `
			<a class="search-hit" href="#/${hit.book.id}/${hit.chapter.id}">
				<small>${esc(hit.book.title)} · ${esc(chapterLabel(hit.chapter))}</small>
				<strong>${esc(hit.chapter.title)}</strong>
				<span>${esc(hit.snippet)}</span>
			</a>
		`,
		)
		.join("");
}

function setRail(open) {
	document.documentElement.classList.toggle("rail-open", open);
	const scrim = app.querySelector("[data-rail-close]");
	if (scrim) scrim.hidden = !open;
	app.querySelector("[data-rail]")?.setAttribute("aria-expanded", open ? "true" : "false");
}

function bindChrome() {
	app.querySelector("[data-theme-toggle]")?.addEventListener("click", cycleTheme);
	app.querySelectorAll("[data-font]").forEach((btn) => {
		btn.addEventListener("click", () => cycleFont(Number(btn.dataset.font)));
	});
	syncFontButtons();
	app.querySelector("[data-search-open]")?.addEventListener("click", openSearch);
	app.querySelector("[data-search-close]")?.addEventListener("click", closeSearch);
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
	setRail(false);
	document.documentElement.classList.remove("search-open");
	searchOpener = null;
	window.scrollTo(0, 0);
	if (route.view !== "library") {
		app.innerHTML = `${topbar({ title: "Opening…" })}<main id="main" class="missing"><p>Opening…</p></main>`;
	}
	if (route.view === "library") app.innerHTML = libraryView();
	else if (route.view === "book") app.innerHTML = await bookView(route.bookId);
	else app.innerHTML = await readerView(route);
	if (seq !== renderSeq) return;
	applyPrefs();
	bindChrome();
	bindCopy();
	bindImages();
	if (route.view === "read") bindScroll(route);
	document.title =
		route.view === "library"
			? "You Don't Know JS Yet"
			: route.view === "book"
				? `${getBook(route.bookId).title} · YDKJSY`
				: `${getChapter(route.bookId, route.chapterId).chapter.title} · YDKJSY`;
}

window.addEventListener("hashchange", render);
window.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		closeSearch();
		setRail(false);
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
	if (event.key === "[" && loc.prev) go(`#/${loc.book.id}/${loc.prev.id}`);
	if (event.key === "]" && loc.next) go(`#/${loc.book.id}/${loc.next.id}`);
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyPrefs);

applyPrefs();
render();
