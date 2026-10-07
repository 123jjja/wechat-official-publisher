const esc = (s = "") => String(s).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const themes = {
  clean: { accent: "#07c160", title: "#17233d", text: "#2f3640", muted: "#7f8c8d", soft: "#f4fbf7" },
  business: { accent: "#2457a6", title: "#14213d", text: "#303642", muted: "#7a8493", soft: "#f2f6fc" },
  warm: { accent: "#c7673e", title: "#3c2f2f", text: "#443b38", muted: "#8d7b73", soft: "#fbf5f1" }
};

function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#17233d;font-weight:650">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f1f3f5;padding:2px 5px;border-radius:4px;font-size:0.9em">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#576b95;text-decoration:none">$1</a>');
}

function formatArticleRich({ title = "", content = "", author = "", theme = "clean", includeTitle = true }) {
  const t = themes[theme] || themes.clean;
  const lines = String(content).replace(/\r/g, "").split("\n");
  let html = `<section style="box-sizing:border-box;padding:8px 6px;color:${t.text};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.85;letter-spacing:.02em;word-break:break-word">`;
  if (includeTitle && title) html += `<h1 style="margin:12px 0 18px;color:${t.title};font-size:26px;line-height:1.35;font-weight:750;letter-spacing:.01em">${inline(title)}</h1>`;
  if (author) html += `<p style="margin:0 0 24px;color:${t.muted};font-size:13px;line-height:1.6">${inline(author)}</p>`;
  let list = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    let m;
    if ((m = line.match(/^###\s+(.+)/))) { closeList(); html += `<h3 style="margin:28px 0 10px;color:${t.title};font-size:18px;line-height:1.5;font-weight:700">${inline(m[1])}</h3>`; }
    else if ((m = line.match(/^##\s+(.+)/))) { closeList(); html += `<h2 style="margin:34px 0 14px;padding-left:11px;border-left:4px solid ${t.accent};color:${t.title};font-size:21px;line-height:1.45;font-weight:720">${inline(m[1])}</h2>`; }
    else if ((m = line.match(/^#\s+(.+)/))) { closeList(); html += `<h2 style="margin:34px 0 14px;color:${t.title};font-size:22px;line-height:1.45;font-weight:740">${inline(m[1])}</h2>`; }
    else if ((m = line.match(/^>\s?(.+)/))) { closeList(); html += `<blockquote style="margin:20px 0;padding:14px 16px;border-left:3px solid ${t.accent};background:${t.soft};color:#56606b;font-size:15px;line-height:1.8">${inline(m[1])}</blockquote>`; }
    else if ((m = line.match(/^[-*]\s+(.+)/))) { if (list !== "ul") { closeList(); list = "ul"; html += '<ul style="margin:14px 0;padding-left:1.3em">'; } html += `<li style="margin:7px 0;padding-left:3px">${inline(m[1])}</li>`; }
    else if ((m = line.match(/^\d+[.)]\s+(.+)/))) { if (list !== "ol") { closeList(); list = "ol"; html += '<ol style="margin:14px 0;padding-left:1.4em">'; } html += `<li style="margin:7px 0;padding-left:3px">${inline(m[1])}</li>`; }
    else if ((m = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/))) { closeList(); html += `<figure style="margin:22px 0;text-align:center"><img src="${esc(m[2])}" alt="${esc(m[1])}" style="display:block;width:100%;height:auto;border-radius:4px"/><figcaption style="margin-top:8px;color:${t.muted};font-size:12px;line-height:1.5">${inline(m[1])}</figcaption></figure>`; }
    else if (/^---+$/.test(line)) { closeList(); html += `<hr style="margin:28px auto;border:0;border-top:1px solid #e8eaed;width:38%"/>`; }
    else { closeList(); html += `<p style="margin:0 0 16px;text-align:justify">${inline(line)}</p>`; }
  }
  closeList();
  html += "</section>";
  return html;
}

// Conservative markup for content copied into the WeChat editor. Each text block owns
// its font size, line height and alignment; links are moved to short, separate lines.
function plainInline(text) {
  const links = [];
  const stripped = String(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      links.push({ label, url });
      return label;
    })
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
  return { text: esc(stripped), links };
}

export function formatArticle({ title = "", content = "", author = "", theme = "clean", includeTitle = true, mobileSafe = true }) {
  if (!mobileSafe) return formatArticleRich({ title, content, author, theme, includeTitle });
  const t = themes[theme] || themes.clean;
  const paragraph = (text, size = 16, bottom = 16, color = t.text, weight = 400, top = 0) =>
    `<p style="margin:0;padding:${top}px 0 ${bottom}px;text-align:left;font-size:${size}px;line-height:${size * 2}px;font-weight:${weight};color:${color};word-break:break-word">${text}</p>`;
  let html = "";
  const addText = (raw, size = 16, bottom = 16, color = t.text, weight = 400, top = 0) => {
    const { text, links } = plainInline(raw);
    html += paragraph(text, size, bottom, color, weight, top);
    for (const [index, link] of links.entries()) {
      const label = links.length === 1 ? "原文链接" : `原文链接 ${index + 1}`;
      html += paragraph(`<a href="${esc(link.url)}" style="font-size:13px;line-height:26px;color:${t.accent};text-decoration:underline">${label}</a>`, 13, 8, t.accent);
    }
  };
  if (includeTitle && title) addText(title, 25, 18, t.title, 700);
  if (author) addText(author, 13, 22, t.muted);
  for (const raw of String(content).replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^###\s+(.+)/))) addText(m[1], 18, 10, t.title, 700, 18);
    else if ((m = line.match(/^##\s+(.+)/))) addText(m[1], 20, 12, t.title, 700, 22);
    else if ((m = line.match(/^#\s+(.+)/))) addText(m[1], 21, 12, t.title, 700, 22);
    else if ((m = line.match(/^>\s?(.+)/))) addText(m[1], 16, 18, t.accent, 400);
    else if ((m = line.match(/^[-*]\s+(.+)/))) addText(`• ${m[1]}`, 16, 10);
    else if ((m = line.match(/^(\d+)[.)]\s+(.+)/))) addText(`${m[1]}. ${m[2]}`, 16, 10);
    else if ((m = line.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/))) {
      html += `<p style="margin:0;padding:8px 0 10px;text-align:left;line-height:normal"><img src="${esc(m[2])}" alt="${esc(m[1])}" style="display:block;width:100%;height:auto;border:0"></p>`;
      if (m[1]) addText(m[1], 12, 18, t.muted);
    }
    else if (/^---+$/.test(line)) html += paragraph("—", 16, 16, t.muted);
    else addText(line);
  }
  return html;
}

export function previewDocument({ title, html }) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title || "公众号文章预览")}</title><style>body{margin:0;background:#eef1f4}.phone{max-width:430px;margin:28px auto;background:white;min-height:calc(100vh - 56px);box-shadow:0 12px 40px #1c27331f;padding:26px 22px;box-sizing:border-box}@media(max-width:500px){.phone{margin:0;box-shadow:none;min-height:100vh}}</style></head><body><main class="phone">${html}</main></body></html>`;
}
