import { chapterLabel, getChapter } from "./catalog.js";
import { announce, app, esc, focusables, trapTabCycle } from "./dom.js";
import { cycleFont, FONT_STEPS, fontStepIndex, setReadMenu, setTheme, syncReadMenu } from "./prefs.js";
import { marbleStatus } from "./progress.js";
import { parseRoute } from "./route.js";
import { runSearch } from "./search.js";
import { store } from "./store.js";

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
			? `<p class="read-hint"><kbd>/</kbd> search · <kbd>[</kbd> <kbd>]</kbd> chapters · <kbd>?</kbd> keys</p>`
			: `<p class="read-hint"><kbd>/</kbd> or <kbd>⌘K</kbd> search · <kbd>?</kbd> keys</p>`;
	return `
		<div class="read-menu">
			<button class="text-btn" type="button" data-read-menu aria-expanded="false" aria-controls="read-panel" aria-haspopup="true" aria-label="Type size and theme">Display</button>
			<div class="read-panel" id="read-panel" hidden>
				<p class="read-legend" id="type-legend">Type</p>
				<div class="read-row" role="group" aria-labelledby="type-legend">
					<button class="text-btn" type="button" data-font="-1" aria-label="Decrease type size"${fontIndex <= 0 ? " disabled" : ""}>A−</button>
					<button class="text-btn" type="button" data-font="1" aria-label="Increase type size"${fontIndex >= FONT_STEPS.length - 1 ? " disabled" : ""}>A+</button>
				</div>
				<p class="read-step" data-type-step>Size ${fontIndex + 1} of ${FONT_STEPS.length}</p>
				<p class="read-legend" id="theme-legend">Theme</p>
				<div class="read-row" role="radiogroup" aria-labelledby="theme-legend">
					<button class="text-btn" type="button" role="radio" data-theme-set="system" aria-checked="${prefs.theme === "system"}">Auto</button>
					<button class="text-btn" type="button" role="radio" data-theme-set="day" aria-checked="${prefs.theme === "day"}">Day</button>
					<button class="text-btn" type="button" role="radio" data-theme-set="night" aria-checked="${prefs.theme === "night"}">Night</button>
				</div>
				${hint}
			</div>
		</div>
	`;
}

export function topbar({ title, bookId, view }) {
	return `
		<header class="topbar">
			<div class="topbar-left">
				${bookId ? `<button class="text-btn rail-toggle" type="button" data-rail aria-expanded="false" aria-controls="toc-rail">${iconMenu()} Contents</button>` : ""}
				<a class="brand" href="#/">
					<span class="brand-mark" aria-hidden="true"></span>
					<span class="brand-name">YDKJS<span>Yet</span></span>
				</a>
			</div>
			<p class="topbar-title">${esc(title)}</p>
			<div class="topbar-right">
				${readMenuHtml(view)}
				<button class="text-btn search-open" type="button" data-search-open aria-expanded="false" aria-controls="search-dialog">${iconSearch()} Search</button>
				<button class="text-btn" type="button" data-keys-open aria-expanded="false" aria-controls="keys-dialog">Keys</button>
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
					<p class="search-hint">Try <em>closure</em>, <em>coercion</em>, or <em>event loop</em>. <kbd>/</kbd> opens search. <kbd>?</kbd> lists keys.</p>
				</div>
			</div>
		</div>
	`;
}

function keysModal() {
	return `
		<div class="keys" hidden data-keys>
			<div class="keys-panel" id="keys-dialog" role="dialog" aria-modal="true" aria-labelledby="keys-title">
				<h2 id="keys-title">Keys</h2>
				<dl class="keys-list">
					<div><dt><kbd>/</kbd> or <kbd>⌘K</kbd></dt><dd>Search all six books</dd></div>
					<div><dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>Previous or next chapter</dd></div>
					<div><dt><kbd>?</kbd></dt><dd>This list</dd></div>
					<div><dt><kbd>Esc</kbd></dt><dd>Close search, contents, display, or this list</dd></div>
				</dl>
				<p class="keys-note">Empty marble: not started. Ember ring: this chapter. Gold: finished. Continue on the library returns you to the last paragraph.</p>
				<button type="button" class="text-btn" data-keys-close>Close</button>
			</div>
		</div>
		<p class="sr-only" data-live aria-live="polite" aria-atomic="true"></p>
	`;
}

export function chromeExtras() {
	return `${searchModal()}${keysModal()}`;
}

let searchOpener = null;
let railOpener = null;
let keysOpener = null;

export function resetOverlayOpeners() {
	searchOpener = null;
}

function railIsDrawer() {
	return window.matchMedia("(max-width: 980px)").matches;
}

function railFocusables() {
	const rail = app.querySelector("[data-rail-panel]");
	if (!rail) return [];
	return [...rail.querySelectorAll("a[href], button:not([disabled])")].filter((el) => !el.hidden);
}

export function trapRailTab(event) {
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

export function setRail(open) {
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

export function closeSearch() {
	const root = app.querySelector("[data-search]");
	if (!root || root.hidden) return;
	root.hidden = true;
	document.documentElement.classList.remove("search-open");
	app.querySelector("[data-search-open]")?.setAttribute("aria-expanded", "false");
	if (searchOpener && typeof searchOpener.focus === "function") searchOpener.focus();
	searchOpener = null;
}

export function closeKeys() {
	const root = app.querySelector("[data-keys]");
	if (!root || root.hidden) return;
	root.hidden = true;
	document.documentElement.classList.remove("keys-open");
	app.querySelector("[data-keys-open]")?.setAttribute("aria-expanded", "false");
	if (keysOpener && typeof keysOpener.focus === "function") keysOpener.focus();
	keysOpener = null;
}

export function openSearch() {
	const root = app.querySelector("[data-search]");
	if (!root) return;
	if (document.documentElement.classList.contains("rail-open")) {
		railOpener = null;
		setRail(false);
	}
	setReadMenu(false);
	closeKeys();
	searchOpener = document.activeElement;
	root.hidden = false;
	document.documentElement.classList.add("search-open");
	app.querySelector("[data-search-open]")?.setAttribute("aria-expanded", "true");
	const input = root.querySelector("input");
	input.focus();
	input.select();
}

export function openKeys() {
	const root = app.querySelector("[data-keys]");
	if (!root) return;
	closeSearch();
	setReadMenu(false);
	setRail(false);
	keysOpener = document.activeElement;
	root.hidden = false;
	document.documentElement.classList.add("keys-open");
	app.querySelector("[data-keys-open]")?.setAttribute("aria-expanded", "true");
	root.querySelector("[data-keys-close]")?.focus();
}

export function bindChrome({ onRerender }) {
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
	app.querySelector("[data-keys-open]")?.addEventListener("click", openKeys);
	app.querySelector("[data-keys-close]")?.addEventListener("click", closeKeys);
	app.querySelectorAll("[data-finish]").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			const [bookId, chapterId] = btn.dataset.finish.split("/");
			store.setChapterDone(bookId, chapterId, true);
			announce("Chapter marked finished.");
			btn.hidden = true;
			const unread = app.querySelector("[data-unread]");
			if (unread) unread.hidden = false;
			app.querySelector(".rail-item.is-active .marble")?.classList.add("is-done");
			const loc = getChapter(bookId, chapterId);
			const small = app.querySelector(".rail-item.is-active small");
			if (small && loc) {
				small.textContent = `${chapterLabel(loc.chapter)} · ${marbleStatus({ max: 1, done: true }, true)}`;
			}
		});
	});
	const keysRoot = app.querySelector("[data-keys]");
	keysRoot?.addEventListener("click", (event) => {
		if (event.target.matches("[data-keys]")) closeKeys();
	});
	keysRoot?.addEventListener("keydown", (event) => {
		if (event.key !== "Tab" || !keysRoot || keysRoot.hidden) return;
		trapTabCycle(event, focusables(keysRoot));
	});
	app.querySelectorAll("[data-unread]").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const [bookId, chapterId] = btn.dataset.unread.split("/");
			store.setChapterUnread(bookId, chapterId);
			const route = parseRoute();
			if (route.view === "book") {
				onRerender();
				return;
			}
			announce("Chapter marked unread.");
			app.querySelector("[data-unread]")?.setAttribute("hidden", "");
			const pct = Number(app.querySelector("[data-progress-meter]")?.getAttribute("aria-valuenow") ?? 0);
			const finish = app.querySelector("[data-finish]");
			if (finish) finish.hidden = pct < 92;
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
		const jump = event.target.closest("[data-jump]");
		if (jump) sessionStorage.setItem("ydkjs-jump", jump.dataset.jump);
	});
	searchRoot?.addEventListener("keydown", (event) => {
		if (event.key !== "Tab" || !searchRoot || searchRoot.hidden) return;
		trapTabCycle(event, focusables(searchRoot));
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
