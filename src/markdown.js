import { Marked, marked } from "marked";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import plaintext from "highlight.js/lib/languages/plaintext";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("text", plaintext);
hljs.registerLanguage("plaintext", plaintext);

const CALLOUT_RE =
	/^\| (NOTE|TIP|WARNING):\s*\|\s*\n\|[:\s|-]+\|\s*\n\|[ \t]*(.*?)[ \t]*\|[ \t]*$/gm;

export function slugify(text) {
	return String(text)
		.replace(/<[^>]+>/g, "")
		.replace(/[`*_~]/g, "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/&[a-z]+;/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function liftCallouts(markdown) {
	return markdown.replace(CALLOUT_RE, (_, kind, body) => {
		const html = marked.parseInline(body, { async: false });
		return `\n\n<div class="callout callout-${kind.toLowerCase()}" data-kind="${kind}"><p>${html}</p></div>\n\n`;
	});
}

function liftFootnotes(markdown) {
	const chunks = markdown.split(/(```[\s\S]*?```)/);
	const defs = new Map();
	const stripped = chunks.map((chunk, index) => {
		if (index % 2 === 1) return chunk;
		return chunk.replace(/^\[\^([A-Za-z][\w-]*)\]:\s*(.+)$/gm, (_, id, body) => {
			defs.set(id, body.trim());
			return "";
		});
	});
	const withRefs = stripped.map((chunk, index) => {
		if (index % 2 === 1) return chunk;
		return chunk.replace(/\[\^([A-Za-z][\w-]*)\]/g, (_, id) => {
			if (!defs.has(id)) return `[^${id}]`;
			return `<sup class="fn-ref"><a href="#fn-${slugify(id)}">${escapeHtml(id)}</a></sup>`;
		});
	});
	const next = withRefs.join("");
	if (!defs.size) return next;
	const items = [...defs]
		.map(([id, body]) => {
			const html = marked.parseInline(body, { async: false });
			return `<li id="fn-${slugify(id)}">${html}</li>`;
		})
		.join("");
	return `${next}\n\n<section class="footnotes"><h2>Notes</h2><ol>${items}</ol></section>\n`;
}

function liftIndentedFigures(markdown) {
	const chunks = markdown.split(/(```[\s\S]*?```)/);
	return chunks
		.map((chunk, index) =>
			index % 2 === 1 ? chunk : chunk.replace(/^[ \t]{4,}(?=<(?:img|figcaption|br)\b)/gim, ""),
		)
		.join("");
}

function stripSeriesTitle(markdown) {
	return markdown.replace(/^# You Don't Know JS Yet[^\n]*\n+/i, "");
}

function rewriteInternalHref(href, bookId) {
	if (!href || href.startsWith("#") || /^(https?:|mailto:|\/\/)/i.test(href)) {
		return href;
	}
	const [path, hash] = href.split("#");
	const file = path.replace(/^\.\.\//, "").replace(/^\.\//, "");
	if (!file.endsWith(".md")) return href;

	const slug = file.replace(/\.md$/, "");
	let route;
	if (slug === "preface" || slug === "../preface" || slug.endsWith("/preface")) {
		route = `#/${bookId}/preface`;
	} else if (slug === "toc" || slug.endsWith("/toc")) {
		route = `#/${bookId}`;
	} else if (slug.includes("/")) {
		const [otherBook, chapter] = slug.split("/");
		route = `#/${otherBook}/${chapter}`;
	} else {
		route = `#/${bookId}/${slug}`;
	}
	return hash ? `${route}/${slugify(hash)}` : route;
}

const FIGURE_SIZE = {
	"es-next-beyond/fig1.svg": [720, 400],
	"get-started/fig1.png": [1200, 375],
	"get-started/fig1.svg": [1200, 375],
	"get-started/fig2.png": [1200, 260],
	"get-started/fig2.svg": [1200, 260],
	"get-started/fig3.png": [1200, 270],
	"get-started/fig3.svg": [1200, 270],
	"get-started/fig4.png": [470, 970],
	"get-started/fig4.svg": [470, 970],
	"get-started/fig5.png": [470, 970],
	"get-started/fig5.svg": [470, 970],
	"get-started/fig6.png": [1040, 950],
	"get-started/fig6.svg": [1040, 950],
	"objects-classes/fig1.svg": [720, 400],
	"scope-closures/fig1.png": [1200, 800],
	"scope-closures/fig2.png": [1030, 1180],
	"scope-closures/fig3.png": [450, 585],
	"scope-closures/fig4.png": [1000, 600],
	"scope-closures/fig5.png": [1000, 875],
	"sync-async/fig1.svg": [720, 300],
	"sync-async/fig2.svg": [720, 360],
	"sync-async/fig3.svg": [720, 280],
};

function figureFile(src) {
	return String(src).split("/").pop()?.split("?")[0] ?? "";
}

function sizeFor(bookId, src) {
	return FIGURE_SIZE[`${bookId}/${figureFile(src)}`] ?? null;
}

function decorateImages(html, bookId) {
	return html.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
		let next = attrs;
		const srcMatch = next.match(/\bsrc=["']([^"']+)["']/i);
		if (!srcMatch?.[1]) return full;
		let src = srcMatch[1];
		if (src.startsWith("images/")) {
			src = `/books/${bookId}/${src}`;
			next = next.replace(srcMatch[0], `src="${escapeHtml(src)}"`);
		}
		next = next.replace(/\s+align=["'][^"']*["']/gi, "");
		if (!/\bloading=/i.test(next)) next += ` loading="lazy"`;
		if (!/\bdecoding=/i.test(next)) next += ` decoding="async"`;
		const size = sizeFor(bookId, src);
		if (size) {
			next = /\bwidth=/i.test(next)
				? next.replace(/\bwidth=["'][^"']*["']/i, `width="${size[0]}"`)
				: `${next} width="${size[0]}"`;
			next = /\bheight=/i.test(next)
				? next.replace(/\bheight=["'][^"']*["']/i, `height="${size[1]}"`)
				: `${next} height="${size[1]}"`;
		}
		return `<img${next}>`;
	});
}

function highlight(code, lang) {
	const language = lang && hljs.getLanguage(lang) ? lang : "javascript";
	try {
		return hljs.highlight(code, { language }).value;
	} catch {
		return escapeHtml(code);
	}
}

function headingText(inner) {
	const doc = new DOMParser().parseFromString(`<div>${inner}</div>`, "text/html");
	return (doc.body.textContent ?? "").trim();
}

export function extractHeadings(html) {
	const headings = [];
	const re = /<h([2-4])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
	let match;
	while ((match = re.exec(html))) {
		headings.push({ depth: Number(match[1]), id: match[2], text: headingText(match[3]) });
	}
	return headings;
}

export function renderMarkdown(markdown, { bookId, chapterId }) {
	const prepared = liftIndentedFigures(liftFootnotes(liftCallouts(stripSeriesTitle(markdown))));

	const parser = new Marked();
	parser.use({
		gfm: true,
		breaks: false,
		renderer: {
			heading({ tokens, depth, text }) {
				const inner = this.parser.parseInline(tokens);
				const id = slugify(text);
				if (depth === 1) {
					return `<h1 id="${id}">${inner}</h1>\n`;
				}
				const href = `#/${bookId}/${chapterId}/${id}`;
				return `<h${depth} id="${id}"><a class="heading-link" href="${href}">${inner}</a></h${depth}>\n`;
			},
			code({ text, lang }) {
				const language = (lang || "js").split(/\s+/)[0];
				const highlighted = highlight(text, language);
				const label = language === "javascript" || language === "js" ? "js" : language;
				return `<div class="code-block"><div class="code-meta"><span>${escapeHtml(label)}</span><button type="button" class="copy-code" data-copy>Copy</button></div><pre><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre></div>\n`;
			},
			link({ href, title, tokens }) {
				const inner = this.parser.parseInline(tokens);
				const next = rewriteInternalHref(href, bookId);
				const external = /^(https?:|mailto:)/i.test(next);
				const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
				const extra = external ? ` target="_blank" rel="noopener noreferrer"` : "";
				return `<a href="${escapeHtml(next)}"${titleAttr}${extra}>${inner}</a>`;
			},
			image({ href, title, text }) {
				if (!href) return "";
				const src = href.startsWith("images/") ? `/books/${bookId}/${href}` : href;
				const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
				const size = sizeFor(bookId, src);
				const dims = size ? ` width="${size[0]}" height="${size[1]}"` : "";
				return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text)}"${titleAttr}${dims} loading="lazy" decoding="async">`;
			},
		},
	});

	return decorateImages(parser.parse(prepared, { async: false }), bookId);
}

export function plainText(markdown) {
	return stripSeriesTitle(markdown)
		.replace(/^\| (NOTE|TIP|WARNING):[\s\S]*?\|[ \t]*$/gm, " ")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
		.replace(/\[[^\]]*\]\([^)]+\)/g, " ")
		.replace(/[#>*_~]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
