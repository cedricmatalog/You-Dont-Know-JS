import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";

const books = [
	"get-started",
	"scope-closures",
	"objects-classes",
	"types-grammar",
	"sync-async",
	"es-next-beyond",
];

function copyBookImages() {
	return {
		name: "copy-book-images",
		closeBundle() {
			for (const book of books) {
				const from = join(process.cwd(), book, "images");
				if (!existsSync(from)) continue;
				const to = join(process.cwd(), "dist", book, "images");
				mkdirSync(join(process.cwd(), "dist", book), { recursive: true });
				cpSync(from, to, { recursive: true });
			}
		},
	};
}

export default defineConfig({
	plugins: [copyBookImages()],
});
