import { createReadStream, cpSync, existsSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { defineConfig } from "vite";

const books = [
	"get-started",
	"scope-closures",
	"objects-classes",
	"types-grammar",
	"sync-async",
	"es-next-beyond",
];

const IMAGE_TYPES = {
	".svg": "image/svg+xml; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
};

function copyBookImages() {
	return {
		name: "copy-book-images",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const path = decodeURIComponent((req.url || "").split("?")[0]);
				const match = path.match(/^\/books\/([a-z0-9-]+)\/images\/([^/]+)$/i);
				if (!match || match[2].includes("..")) return next();
				const file = normalize(join(process.cwd(), "books", match[1], "images", match[2]));
				const root = join(process.cwd(), "books", match[1], "images");
				if (!file.startsWith(root) || !existsSync(file)) return next();
				const type = IMAGE_TYPES[extname(file).toLowerCase()];
				if (!type) return next();
				res.setHeader("Content-Type", type);
				createReadStream(file).pipe(res);
			});
		},
		closeBundle() {
			for (const book of books) {
				const from = join(process.cwd(), "books", book, "images");
				if (!existsSync(from)) continue;
				const to = join(process.cwd(), "dist", "books", book, "images");
				mkdirSync(join(process.cwd(), "dist", "books", book), { recursive: true });
				cpSync(from, to, { recursive: true });
			}
		},
	};
}

export default defineConfig({
	plugins: [copyBookImages()],
});
