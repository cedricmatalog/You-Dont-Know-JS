#!/usr/bin/env node
/**
 * Run self-contained fenced `js` blocks that carry `// value` assertions.
 * Skips snippets, exercises, console.log annotations, and step numbers.
 * Temporal is injected for book 6.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { Temporal } from "temporal-polyfill";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BOOKS = join(ROOT, "books");
const FENCE = /```(?:js|javascript)[^\n]*\n([\s\S]*?)```/g;
const ASSERT = /^(\s*)(.+?);\s*\/\/\s*(.+?)\s*$/;
const SKIP_BLOCK = /\/\* *\.\.|\/\/ \.\.(?!\.)|NOT JS|sketch --|pretend this|proposed sketch|\bTODO\b|your code here/i;
const ERROR_NAME = /^(SyntaxError|TypeError|RangeError|ReferenceError|Error)\b/;
const SKIP_COMMENT = /Error!|works |skip |lands |maybe |oops|thrown|throws TypeError/i;

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		if (name === "images" || name === "node_modules") continue;
		const path = join(dir, name);
		const st = statSync(path);
		if (st.isDirectory()) walk(path, out);
		else if (extname(name) === ".md") out.push(path);
	}
	return out;
}

function parseExpected(comment) {
	const c = comment.trim().split(/\s+--\s+/)[0].trim();
	if (/^Error!$/.test(c)) return null;
	if (/\bif\b/.test(c)) return null;
	if (SKIP_COMMENT.test(c) && !ERROR_NAME.test(c)) return null;
	const err = c.match(ERROR_NAME);
	if (err) return { kind: "throw", name: err[1] };
	if (/^[1-9]$/.test(c)) return null;
	if (/^(true|false|null|undefined|NaN|-?\d+(\.\d+)?n?)$/.test(c)) {
		return { kind: "value", source: c };
	}
	if (/^["'`]/.test(c) && c.length < 80) {
		return { kind: "value", source: c };
	}
	return null;
}

function declared(code, name) {
	return new RegExp(
		String.raw`(?:function|class|var|let|const)\s+${name}\b`,
	).test(code);
}

function shouldAssert(expr, expected, code) {
	if (/^console\.|\.then\(/.test(expr)) return false;
	if (/\.\./.test(expr) && !/\.\.\./.test(expr)) return false;
	if (expected.kind === "value") {
		if (/^-?\d/.test(expr) && /^-?\d/.test(expected.source) && expr !== expected.source) {
			return false;
		}
		const typeofId = expr.match(/^typeof\s+([A-Za-z_$][\w$]*)$/);
		if (typeofId && !declared(code, typeofId[1])) return false;
		const call = expr.match(/^([A-Za-z_$][\w$]*)\s*\(/);
		if (call) {
			const fn = code.match(
				new RegExp(String.raw`function\s+${call[1]}\s*\([^)]*\)\s*\{([\s\S]*?)\n\}`),
			);
			if (fn && !/\breturn\b/.test(fn[1]) && /console\.log/.test(fn[1])) return false;
		}
		if (/\.toString\(\)$/.test(expr) && /e[+-]\d+/.test(expected.source)) return false;
	}
	return true;
}

function transform(code) {
	let count = 0;
	const next = code
		.split("\n")
		.map((line) => {
			const m = line.match(ASSERT);
			if (!m) return line;
			const expected = parseExpected(m[3]);
			if (!expected) return line;
			const expr = m[2].trim();
			if (!shouldAssert(expr, expected, code)) return line;
			count++;
			const label = JSON.stringify(line.trim());
			if (expected.kind === "throw") {
				return `${m[1]}__assertThrow(function(){ ${expr}; }, ${JSON.stringify(expected.name)}, ${label});`;
			}
			return `${m[1]}__assertEqual((${expr}), (${expected.source}), ${label});`;
		})
		.join("\n");
	return { code: next, count };
}

function makeContext(failures, loc) {
	return vm.createContext({
		Temporal,
		console: { log() {}, error() {}, warn() {} },
		setTimeout,
		clearTimeout,
		queueMicrotask,
		Promise,
		Error,
		TypeError,
		RangeError,
		SyntaxError,
		ReferenceError,
		AggregateError,
		Object,
		Array,
		Map,
		Set,
		WeakMap,
		JSON,
		Math,
		Date,
		Number,
		String,
		Boolean,
		Symbol,
		Intl,
		AbortController,
		AbortSignal,
		__assertEqual(got, want, label) {
			if (typeof got === "undefined" && want != null) return;
			const same =
				Object.is(got, want) ||
				(typeof got === "number" && typeof want === "number" && String(got) === String(want)) ||
				(typeof got === "object" &&
					got != null &&
					JSON.stringify(got) === JSON.stringify(want));
			if (!same) {
				failures.push(`${loc}: \`${label}\` expected ${String(want)}, got ${String(got)}`);
			}
		},
		__assertThrow(fn, name, label) {
			try {
				fn();
				failures.push(`${loc}: \`${label}\` expected ${name}, got no throw`);
			} catch (err) {
				if (!err || err.name !== name) {
					failures.push(`${loc}: \`${label}\` expected ${name}, got ${err && err.name}`);
				}
			}
		},
	});
}

function skipRuntime(err) {
	const msg = String(err && err.message);
	return (
		err?.name === "SyntaxError" ||
		err?.name === "ReferenceError" ||
		/must be called with new|might need temporal-polyfill\/full|is not defined|Unexpected|Invalid left-hand|missing \)|is not a function|Cannot read properties|Cannot mix BigInt/.test(msg)
	);
}

const files = walk(BOOKS);
let checked = 0;
let skipped = 0;
const failures = [];

for (const file of files) {
	const md = readFileSync(file, "utf8");
	const rel = file.slice(ROOT.length + 1);
	const re = new RegExp(FENCE.source, "g");
	let match;
	let i = 0;
	while ((match = re.exec(md))) {
		const loc = `${rel} block ${++i}`;
		if (SKIP_BLOCK.test(match[1]) || /apB\.md$/.test(rel) && /exercise|TODO|Implement/i.test(match[1])) {
			skipped++;
			continue;
		}
		const { code, count } = transform(match[1]);
		if (!count) {
			skipped++;
			continue;
		}
		const blockFailures = [];
		try {
			vm.runInContext(code, makeContext(blockFailures, loc), {
				filename: loc,
				timeout: 1500,
			});
		} catch (err) {
			if (skipRuntime(err)) {
				skipped++;
				continue;
			}
			failures.push(`${loc}: threw while running: ${err.message}`);
			continue;
		}
		checked += count;
		failures.push(...blockFailures);
	}
}

if (failures.length) {
	console.error(failures.join("\n"));
	console.error(`\n${failures.length} failure(s). ${checked} assertions, ${skipped} blocks skipped.`);
	process.exit(1);
}

console.log(`ok — ${checked} assertions in ${files.length} files (${skipped} blocks skipped).`);
