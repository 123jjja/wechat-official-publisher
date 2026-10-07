#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { formatArticle, previewDocument } from "../lib/formatter.mjs";

const args = process.argv.slice(2);
const get = (name, fallback = "") => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const input = get("--input");
const output = get("--output", "wechat-preview.html");
if (!input) { console.error("Usage: node scripts/format-wechat.mjs --input article.md [--output preview.html] [--title title] [--theme clean|business|warm] [--rich]"); process.exit(2); }
const content = fs.readFileSync(path.resolve(input), "utf8");
const title = get("--title", path.basename(input, path.extname(input)));
const html = formatArticle({ title, content, author: get("--author"), theme: get("--theme", "clean"), mobileSafe: !args.includes("--rich") });
fs.writeFileSync(path.resolve(output), previewDocument({ title, html }), "utf8");
console.log(path.resolve(output));
