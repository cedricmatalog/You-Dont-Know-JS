import { chapterLabel, getChapter } from "./catalog.js";
import { announce, app } from "./dom.js";
import { chapterPlace } from "./progress.js";
import { revealQuery } from "./search.js";
import { store } from "./store.js";

export function bindCopy() {
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

export function bindImages() {
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

export function unbindScroll() {
	scrollCleanup?.();
}

export function bindScroll(route) {
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
	const persist = (ratio) => {
		store.setLast(route.bookId, route.chapterId, ratio);
		store.setChapterProgress(route.bookId, route.chapterId, ratio);
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
		const done = store.chapterState(route.bookId, route.chapterId).done;
		app.querySelectorAll(".rail-item.is-active .marble").forEach((el) => {
			el.classList.toggle("is-done", done);
		});
		const finish = app.querySelector("[data-finish]");
		const unread = app.querySelector("[data-unread]");
		if (finish) finish.hidden = !(ratio >= 0.92 && !done);
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
	const jumpQuery = sessionStorage.getItem("ydkjs-jump");
	if (jumpQuery) sessionStorage.removeItem("ydkjs-jump");
	const restore =
		!jumpQuery &&
		!route.heading &&
		last &&
		last.bookId === route.bookId &&
		last.chapterId === route.chapterId &&
		last.scroll > 0.02;
	if (route.heading) {
		const target = document.getElementById(route.heading);
		if (target) target.scrollIntoView();
	} else if (restore) {
		const apply = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			if (max > 0) window.scrollTo(0, last.scroll * max);
		};
		apply();
		window.requestAnimationFrame(apply);
	}
	onScroll();
	ready = true;
	if (jumpQuery) revealQuery(jumpQuery);
	else if (restore) announce(`Returned to ${Math.round(last.scroll * 100)} percent in this chapter.`);
	scrollCleanup = () => {
		window.removeEventListener("scroll", onScroll);
		clearTimeout(persistTimer);
		persist(lastRatio);
		scrollCleanup = null;
	};
}
