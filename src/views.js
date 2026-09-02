import { books, chapterLabel, getBook, getChapter, loadMarkdown, readingMinutes } from "./catalog.js";
import { chromeExtras, topbar } from "./chrome.js";
import { esc } from "./dom.js";
import { extractHeadings, renderMarkdown } from "./markdown.js";
import { chapterPlace, marbleStatus } from "./progress.js";
import { store } from "./store.js";

function seriesAllFinished() {
	return books.every((book) => store.bookProgress(book.id, book.chapters.length) >= 1 - 1e-9);
}

export function libraryView() {
	const last = store.get().last;
	const resume = last && getChapter(last.bookId, last.chapterId);
	const finished = seriesAllFinished();
	const lede = finished
		? "Every part in this checkout is marked finished. Open a spine to reread, or mark a chapter unread."
		: resume
			? `Continue returns you to ${resume.chapter.title} in ${resume.book.title}, at the last paragraph.`
			: "Open a spine to see its parts. Progress saves as you read; Continue will bring you back.";
	return `
		${topbar({ title: "Library", view: "library" })}
		<main id="main" class="library" tabindex="-1">
			<header class="masthead">
				<h1>You Don’t Know JS Yet</h1>
				<p class="lede">${esc(lede)}</p>
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
		${chromeExtras()}
	`;
}

export async function bookView(bookId) {
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
		${chromeExtras()}
	`;
}

export function missingView(route) {
	if (route.kind === "chapter") {
		const book = getBook(route.bookId);
		return `
			${topbar({ title: "Missing chapter", view: "missing" })}
			<main id="main" class="missing" tabindex="-1">
				<p>No chapter named “${esc(route.attempted)}” in ${esc(book.title)}.</p>
				<p><a href="#/${book.id}">Back to ${esc(book.title)}</a></p>
			</main>
			${chromeExtras()}
		`;
	}
	return `
		${topbar({ title: "Missing book", view: "missing" })}
		<main id="main" class="missing" tabindex="-1">
			<p>No book named “${esc(route.attempted)}” in this checkout.</p>
			<p><a href="#/">Back to the library</a></p>
		</main>
		${chromeExtras()}
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
								<a class="rail-h rail-h${heading.depth}" href="#/${book.id}/${item.id}/${heading.id}" data-heading="${esc(heading.id)}">${esc(heading.text)}</a>
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

export async function readerView(route) {
	const loc = getChapter(route.bookId, route.chapterId);
	const markdown = await loadMarkdown(route.bookId, route.chapterId);
	if (!markdown) {
		return `
			${topbar({ title: "Missing chapter", view: "missing" })}
			<main id="main" class="missing" tabindex="-1"><p>This chapter file is missing from the book folder.</p><p><a href="#/${route.bookId}">Back to ${esc(getBook(route.bookId).title)}</a></p></main>
			${chromeExtras()}
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
	const seriesEnd = !loc.next && loc.book.num === 6;

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
					<p class="unread-wrap">
						<button class="text-btn" type="button" data-finish="${loc.book.id}/${loc.chapter.id}" hidden>Mark finished</button>
						<button class="text-btn" type="button" data-unread="${loc.book.id}/${loc.chapter.id}"${done ? "" : " hidden"}>Mark unread</button>
					</p>
				</article>
				${seriesEnd ? `<p class="series-end">That is the last part in this checkout.</p>` : ""}
				<nav class="pager" aria-label="Adjacent chapters">
					<a href="${prevHref}">${loc.prev ? `← ${esc(loc.prev.title)}` : `← ${esc(loc.book.title)}`}</a>
					<a href="${nextHref}">${esc(nextLabel)} →</a>
				</nav>
			</main>
		</div>
		${chromeExtras()}
	`;
}
