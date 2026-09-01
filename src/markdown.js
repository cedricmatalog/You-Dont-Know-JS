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

function highlight(code, lang) {
	const language = lang && hljs.getLanguage(lang) ? lang : "javascript";
	try {
		return hljs.highlight(code, { language }).value;
	} catch {
		return escapeHtml(code);
	}
}

export function extractHeadings(html) {
	const headings = [];
	const re = /<h([2-4])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
	let match;
	while ((match = re.exec(html))) {
		const text = match[3].replace(/<[^>]+>/g, "").trim();
		headings.push({ depth: Number(match[1]), id: match[2], text });
	}
	return headings;
}

export function renderMarkdown(markdown, { bookId, chapterId }) {
	const prepared = liftFootnotes(liftCallouts(stripSeriesTitle(markdown)));

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
				const src = href?.startsWith("images/") ? `/${bookId}/${href}` : href;
				const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
				return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy">`;
			},
		},
	});

	const html = parser.parse(prepared, { async: false });

	return html.replace(
		/(src=["'])images\//g,
		`$1/${bookId}/images/`,
	);
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
