const KEY = "ydkjs-yet-reader";

const defaults = {
	theme: "system",
	fontScale: 1,
	last: null,
	progress: {},
};

function read() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { ...defaults, progress: {} };
		const data = JSON.parse(raw);
		return {
			...defaults,
			...data,
			progress: data.progress ?? {},
		};
	} catch {
		return { ...defaults, progress: {} };
	}
}

function write(data) {
	localStorage.setItem(KEY, JSON.stringify(data));
}

export const store = {
	get() {
		return read();
	},
	setTheme(theme) {
		const data = read();
		data.theme = theme;
		write(data);
		return data;
	},
	setFontScale(fontScale) {
		const data = read();
		data.fontScale = fontScale;
		write(data);
		return data;
	},
	setLast(bookId, chapterId, scroll = 0) {
		const data = read();
		data.last = { bookId, chapterId, scroll, at: Date.now() };
		write(data);
		return data;
	},
	setChapterProgress(bookId, chapterId, ratio, { allowDone = true } = {}) {
		const data = read();
		if (!data.progress[bookId]) data.progress[bookId] = {};
		const prev = data.progress[bookId][chapterId] ?? { max: 0, done: false };
		const max = Math.max(prev.max, ratio);
		data.progress[bookId][chapterId] = {
			max,
			done: allowDone && (prev.done || max >= 0.92),
		};
		write(data);
		return data;
	},
	setChapterUnread(bookId, chapterId) {
		const data = read();
		if (!data.progress[bookId]) data.progress[bookId] = {};
		data.progress[bookId][chapterId] = { max: 0, done: false };
		if (data.last?.bookId === bookId && data.last?.chapterId === chapterId) {
			data.last.scroll = 0;
		}
		write(data);
		return data;
	},
	bookProgress(bookId, chapterCount) {
		const chapters = read().progress[bookId] ?? {};
		const done = Object.values(chapters).filter((item) => item.done).length;
		return chapterCount ? done / chapterCount : 0;
	},
	chapterState(bookId, chapterId) {
		return read().progress[bookId]?.[chapterId] ?? { max: 0, done: false };
	},
};
