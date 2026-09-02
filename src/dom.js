export const app = document.querySelector("#app");

export function esc(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function announce(message) {
	const live = app.querySelector("[data-live]");
	if (!live) return;
	live.textContent = "";
	window.requestAnimationFrame(() => {
		live.textContent = message;
	});
}

export function focusables(root) {
	return [...root.querySelectorAll("a[href], button:not([disabled]), input")].filter(
		(el) => !el.hidden && el.getAttribute("aria-hidden") !== "true",
	);
}

export function trapTabCycle(event, items) {
	if (!items.length) return false;
	const first = items[0];
	const last = items[items.length - 1];
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

export function syncSkip(view) {
	const skip = document.querySelector(".skip-link");
	if (!skip) return;
	skip.textContent =
		view === "read" ? "Skip to chapter" : view === "book" ? "Skip to chapters" : "Skip to library";
}
