# Mobile layout and verification

Use this when formatting an article for phone reading, adding images, or repairing WeChat editor warnings. The default formatter mode is intentionally conservative; richer HTML remains available with `mobile_safe=false`.

## Build for the editor, not only the browser

- Favor flat text paragraphs with inline styles on each text block. Set an explicit standard `text-align:left` and a legible `font-size`/`line-height` pair on the same block. Avoid `text-align:start` and `end`.
- Avoid fixed pixel widths, fixed heights on text containers, ordinary prose in `<pre>`, deeply nested decorative cards, and unnecessary inline elements inside multi-line paragraphs. Image-only blocks may use `line-height:normal`.
- In mobile-safe mode, Markdown emphasis becomes plain text and inline Markdown links become short, separate linked lines. This keeps the destination while avoiding mixed inline text metrics in long paragraphs. Do not remove links from a user's existing article without telling them.
- Keep image-only blocks separate from captions. Use `width:100%;height:auto` for article images and meaningful `alt` text. Generated images with embedded text are harder to read on phones; prefer text-free visuals with separate captions when appropriate.

## Verify after transformation

1. Check that the output preserves the article's facts, links, order, and intended level of editing. A request to “只排版” does not authorize a rewrite.
2. Confirm that all referenced local images exist and that text paragraphs have valid alignment and enough line height. Inspect a narrow-width preview when possible.
3. If content is copied into the WeChat editor, clear the older pasted body before retrying. The editor may rewrite HTML; run its mobile check and inspect an actual phone preview. Treat its paragraph numbers as referring to the transformed editor content, not necessarily source paragraph numbers.
4. When warnings remain, inspect the exact flagged paragraphs and their inline descendants. Do not assume doubling the outer line height fixes a child-level or measured-overlap warning. Make a targeted change, then retest in the editor.
5. Never claim mobile rendering is perfect solely from static HTML checks. Report what was tested and what still needs editor/device verification.

For API drafts, do not submit HTML with `file:`, relative, or data-URI image sources. Upload body images first, then replace each `src` with the returned HTTPS URL. Local previews can still use relative paths.

Reference: [WeChat article structure specification](https://github.com/wechatjs/verify-article-structure-spec/blob/main/verify_article_structure.md), especially the `line-height`, width and `text-align` sections. Its rendering checks are distinct from a source-code lint pass.
