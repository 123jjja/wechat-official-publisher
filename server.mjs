#!/usr/bin/env node
import fs from "node:fs";
import { formatArticle, previewDocument } from "./lib/formatter.mjs";

let buffer = "";
let cachedToken = null;
const write = message => process.stdout.write(JSON.stringify(message) + "\n");
const result = (id, value) => write({ jsonrpc: "2.0", id, result: value });
const fail = (id, code, message) => write({ jsonrpc: "2.0", id, error: { code, message } });
const textResult = text => ({ content: [{ type: "text", text: typeof text === "string" ? text : JSON.stringify(text, null, 2) }] });

async function getToken() {
  if (process.env.WECHAT_ACCESS_TOKEN) return process.env.WECHAT_ACCESS_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 120000) return cachedToken.value;
  const appid = process.env.WECHAT_APP_ID, secret = process.env.WECHAT_APP_SECRET;
  if (!appid || !secret) throw new Error("Missing WECHAT_APP_ID or WECHAT_APP_SECRET");
  const u = new URL("https://api.weixin.qq.com/cgi-bin/stable_token");
  const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "client_credential", appid, secret, force_refresh: false }) });
  const data = await r.json();
  if (!r.ok || data.errcode) throw new Error(`WeChat token error: ${data.errcode || r.status} ${data.errmsg || ""}`);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 7200) * 1000 };
  return cachedToken.value;
}

async function api(path, body) {
  const token = await getToken();
  const r = await fetch(`https://api.weixin.qq.com${path}?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok || data.errcode) throw new Error(`WeChat API error: ${data.errcode || r.status} ${data.errmsg || ""}`);
  return data;
}

async function upload(path, filePath, field = "media") {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const token = await getToken();
  const fd = new FormData();
  const bytes = fs.readFileSync(filePath);
  fd.append(field, new Blob([bytes]), filePath.split("/").pop());
  const r = await fetch(`https://api.weixin.qq.com${path}?access_token=${encodeURIComponent(token)}&type=image`, { method: "POST", body: fd });
  const data = await r.json();
  if (!r.ok || data.errcode) throw new Error(`WeChat upload error: ${data.errcode || r.status} ${data.errmsg || ""}`);
  return data;
}

const tools = [
  { name: "format_wechat_article", description: "Format content as WeChat-compatible HTML. Mobile-safe flat paragraphs are the default; rich mode is optional. Does not publish.", inputSchema: { type: "object", required: ["title", "content"], properties: { title: {type:"string"}, content: {type:"string",description:"Markdown-like plain text"}, author:{type:"string"}, theme:{type:"string",enum:["clean","business","warm"],default:"clean"}, include_title:{type:"boolean",default:true}, mobile_safe:{type:"boolean",default:true,description:"Use flat paragraphs with explicit left alignment and generous line height. Set false for the legacy rich layout."} } } },
  { name: "create_wechat_preview", description: "Create a complete mobile-width HTML preview document from formatted article HTML.", inputSchema: { type:"object", required:["title","html"], properties:{title:{type:"string"},html:{type:"string"}} } },
  { name: "upload_content_image", description: "Upload a local body image to WeChat and return a URL suitable for article HTML.", inputSchema: { type:"object",required:["file_path"],properties:{file_path:{type:"string"}} } },
  { name: "upload_thumb", description: "Upload a local cover image as permanent WeChat material and return its media_id.", inputSchema: { type:"object",required:["file_path"],properties:{file_path:{type:"string"}} } },
  { name: "create_wechat_draft", description: "Create an article in the connected WeChat Official Account draft box.", inputSchema: { type:"object",required:["title","content","thumb_media_id"],properties:{title:{type:"string"},author:{type:"string"},digest:{type:"string"},content:{type:"string",description:"WeChat-compatible HTML"},content_source_url:{type:"string"},thumb_media_id:{type:"string"},need_open_comment:{type:"integer",enum:[0,1],default:0},only_fans_can_comment:{type:"integer",enum:[0,1],default:0}} } },
  { name: "publish_wechat_draft", description: "Submit a WeChat draft for publication. Requires explicit final user approval and confirm=true.", inputSchema: { type:"object",required:["media_id","confirm"],properties:{media_id:{type:"string"},confirm:{type:"boolean",description:"Must be true only after explicit user publication approval"}} } },
  { name: "get_wechat_publish_status", description: "Get the status of a previously submitted WeChat publication.", inputSchema: { type:"object",required:["publish_id"],properties:{publish_id:{type:"string"}} } }
];

async function callTool(name, a) {
  if (name === "format_wechat_article") return textResult({ html: formatArticle({ title:a.title, content:a.content, author:a.author, theme:a.theme, includeTitle:a.include_title !== false, mobileSafe:a.mobile_safe !== false }) });
  if (name === "create_wechat_preview") return textResult({ document: previewDocument({ title:a.title, html:a.html }) });
  if (name === "upload_content_image") return textResult(await upload("/cgi-bin/media/uploadimg", a.file_path));
  if (name === "upload_thumb") return textResult(await upload("/cgi-bin/material/add_material", a.file_path));
  if (name === "create_wechat_draft") {
    const imageSources = [...String(a.content).matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
    if (imageSources.some(src => !/^https:\/\//i.test(src))) throw new Error("Draft blocked: upload local body images with upload_content_image and replace their src values with HTTPS WeChat URLs first");
    return textResult(await api("/cgi-bin/draft/add", { articles: [{ title:a.title, author:a.author || "", digest:a.digest || "", content:a.content, content_source_url:a.content_source_url || "", thumb_media_id:a.thumb_media_id, need_open_comment:a.need_open_comment || 0, only_fans_can_comment:a.only_fans_can_comment || 0 }] }));
  }
  if (name === "publish_wechat_draft") { if (a.confirm !== true) throw new Error("Publication blocked: explicit approval is required and confirm must be true"); return textResult(await api("/cgi-bin/freepublish/submit", { media_id:a.media_id })); }
  if (name === "get_wechat_publish_status") return textResult(await api("/cgi-bin/freepublish/get", { publish_id:a.publish_id }));
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(msg) {
  const { id, method, params = {} } = msg;
  try {
    if (method === "initialize") return result(id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "wechat-official-publisher", version: "0.2.0" } });
    if (method === "notifications/initialized") return;
    if (method === "tools/list") return result(id, { tools });
    if (method === "tools/call") return result(id, await callTool(params.name, params.arguments || {}));
    if (id !== undefined) return fail(id, -32601, `Method not found: ${method}`);
  } catch (e) { if (id !== undefined) fail(id, -32000, e.message); }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { buffer += chunk; let i; while ((i = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); if (line) { try { handle(JSON.parse(line)); } catch {} } } });
