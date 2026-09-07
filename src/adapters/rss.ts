import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { assertSafeExternalUrl } from "@/src/security/urls";
import { normalizeTitle } from "@/src/domain/dedupe";

export type ParsedFeedItem = { guid: string; title: string; normalizedTitle: string; url: string; publishedAt?: Date; description?: string; contentHash: string };
export interface RssAdapter { fetch(url: string): Promise<ParsedFeedItem[]>; }
export class HttpRssAdapter implements RssAdapter {
  private parser = new Parser();
  async fetch(rawUrl: string) {
    const url = assertSafeExternalUrl(rawUrl); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), Number(process.env.RSS_TIMEOUT_MS ?? 8000));
    try { const response = await fetch(url, { signal: controller.signal, redirect: "error", headers: { "user-agent": "NexoEditorial/0.1 (+internal RSS reader)" } }); if (!response.ok) throw new Error(`RSS respondió ${response.status}`); const declared = Number(response.headers.get("content-length") ?? 0); const limit = Number(process.env.RSS_MAX_BYTES ?? 2_000_000); if (declared > limit) throw new Error("El feed excede el tamaño permitido."); const xml = await response.text(); if (Buffer.byteLength(xml) > limit) throw new Error("El feed excede el tamaño permitido."); const feed = await this.parser.parseString(xml); return feed.items.filter((item) => item.title && item.link).map((item) => { const guid = item.guid ?? item.link!; const title = item.title!; const contentHash = createHash("sha256").update(`${guid}|${normalizeTitle(title)}`).digest("hex"); return { guid, title, normalizedTitle: normalizeTitle(title), url: assertSafeExternalUrl(item.link!).toString(), publishedAt: item.isoDate ? new Date(item.isoDate) : undefined, description: item.contentSnippet?.slice(0, 4000), contentHash }; }); } finally { clearTimeout(timer); }
  }
}
export class MockRssAdapter implements RssAdapter { async fetch(url: string) { assertSafeExternalUrl(url); return [{ guid: "demo-rss-1", title: "Agenda cultural de Guatemala para esta semana", normalizedTitle: normalizeTitle("Agenda cultural de Guatemala para esta semana"), url: "https://example.com/agenda-cultural", publishedAt: new Date("2026-08-18T14:00:00Z"), description: "Elemento ficticio para demostrar ingestión RSS.", contentHash: createHash("sha256").update("demo-rss-1").digest("hex") }]; } }
export function createRssAdapter(): RssAdapter { return process.env.DEMO_MODE !== "false" ? new MockRssAdapter() : new HttpRssAdapter(); }
