import assert from "node:assert/strict";
import test from "node:test";
import { formatArticle, previewDocument } from "../lib/formatter.mjs";

test("mobile-safe output keeps flat text blocks and separated links", () => {
  const html = formatArticle({
    title: "API 与 MCP",
    content: "## 场景\n**飞书 API：**查找[资料](https://example.com/doc)并阅读。\n- 第一步\n![示意图](images/diagram.png)"
  });
  assert.match(html, /text-align:left/);
  assert.doesNotMatch(html, /text-align:justify|<strong\b|<section\b|<h[1-6]\b/i);
  assert.match(html, /<p[^>]*>飞书 API：查找资料并阅读。<\/p>/);
  assert.match(html, /href="https:\/\/example.com\/doc"[^>]*>原文链接<\/a>/);
  assert.match(html, /<img src="images\/diagram.png"[^>]*width:100%;height:auto/);
  assert.match(html, /• 第一步/);
  assert.equal((html.match(/<p\b/g) || []).length, (html.match(/<\/p>/g) || []).length);
});

test("all default text blocks specify alignment and ample line height", () => {
  const html = formatArticle({ title: "标题", content: "正文\n> 引语\n1. 列表" });
  for (const p of html.match(/<p\b[^>]*>/g) || []) {
    assert.match(p, /text-align:left/);
    const size = Number(p.match(/font-size:(\d+)px/)?.[1]);
    const height = Number(p.match(/line-height:(\d+)px/)?.[1]);
    assert.ok(size > 0 && height >= size * 2, p);
  }
});

test("legacy rich mode remains selectable", () => {
  const html = formatArticle({ title: "标题", content: "**加粗**", mobileSafe: false });
  assert.match(html, /<section\b/);
  assert.match(html, /<strong\b/);
});

test("preview has a phone-width container without changing article HTML", () => {
  const html = formatArticle({ content: "正文" });
  const preview = previewDocument({ title: "预览", html });
  assert.match(preview, /<main class="phone">/);
  assert.ok(preview.includes(html));
});
