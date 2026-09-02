import { announce, app } from "./dom.js";
import { store } from "./store.js";

export const FONT_STEPS = [0.9, 1, 1.12, 1.28];

export function resolvedTheme(theme) {
	if (theme === "night") return "night";
	if (theme === "day") return "day";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

export function applyPrefs() {
	const prefs = store.get();
	document.documentElement.dataset.theme = resolvedTheme(prefs.theme);
	document.documentElement.style.setProperty("--font-scale", String(prefs.fontScale));
}

function themeSpoken(theme) {
	if (theme === "night") return "Night";
	if (theme === "day") return "Day";
	return "Auto, matching the system";
}

export function fontStepIndex() {
	const index = FONT_STEPS.findIndex((step) => Math.abs(step - store.get().fontScale) < 0.01);
	return index < 0 ? 1 : index;
}

export function syncFontButtons() {
	const i = fontStepIndex();
	const dec = app.querySelector('[data-font="-1"]');
	const inc = app.querySelector('[data-font="1"]');
	if (dec) dec.disabled = i <= 0;
	if (inc) inc.disabled = i >= FONT_STEPS.length - 1;
}

export function syncReadMenu() {
	const prefs = store.get();
	app.querySelectorAll("[data-theme-set]").forEach((btn) => {
		btn.setAttribute("aria-checked", btn.dataset.themeSet === prefs.theme ? "true" : "false");
	});
	syncFontButtons();
	const step = app.querySelector("[data-type-step]");
	if (step) step.textContent = `Size ${fontStepIndex() + 1} of ${FONT_STEPS.length}`;
}

export function setTheme(theme) {
	store.setTheme(theme);
	applyPrefs();
	syncReadMenu();
	announce(`Theme ${themeSpoken(theme)}.`);
}

export function cycleFont(dir) {
	const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, fontStepIndex() + dir))];
	store.setFontScale(next);
	applyPrefs();
	syncReadMenu();
	announce(`Type size ${fontStepIndex() + 1} of ${FONT_STEPS.length}.`);
}

export function setReadMenu(open) {
	const panel = app.querySelector("#read-panel");
	const toggle = app.querySelector("[data-read-menu]");
	if (!panel || !toggle) return;
	panel.hidden = !open;
	toggle.setAttribute("aria-expanded", open ? "true" : "false");
	if (open) panel.querySelector("button:not([disabled])")?.focus();
}
