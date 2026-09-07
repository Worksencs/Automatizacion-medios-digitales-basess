import { Client } from "@notionhq/client";

export type NotionTaskPayload = { workflowId: string; title: string; score: number; status: string; investigationSummary: string; confidence: number; risk: string; sourceLinks: string[]; contradictions: string[]; variants: Array<{ outlet: string; headline: string; body: string }>; suggestedOwner?: string; createdAt: string; dossierUrl: string };
export type NotionSyncResult = { externalPageId: string; externalUrl?: string; mocked: boolean; payload: NotionTaskPayload };
export interface NotionAdapter { syncTask(payload: NotionTaskPayload): Promise<NotionSyncResult>; }

export class MockNotionAdapter implements NotionAdapter {
  private readonly records = new Map<string, NotionSyncResult>();
  async syncTask(payload: NotionTaskPayload) { const existing = this.records.get(payload.workflowId); if (existing) return existing; const result = { externalPageId: `mock-notion-${payload.workflowId}`, externalUrl: undefined, mocked: true, payload }; this.records.set(payload.workflowId, result); return result; }
}

function richText(content: string) { return [{ type: "text" as const, text: { content: content.slice(0, 1900) } }]; }
export class RealNotionAdapter implements NotionAdapter {
  private client = new Client({ auth: process.env.NOTION_API_KEY, notionVersion: process.env.NOTION_API_VERSION ?? "2026-03-11" });
  constructor(private readonly dataSourceId = process.env.NOTION_DATABASE_ID!) {}
  async syncTask(payload: NotionTaskPayload): Promise<NotionSyncResult> {
    const source = await this.client.dataSources.retrieve({ data_source_id: this.dataSourceId });
    const properties = "properties" in source ? source.properties : {};
    const titleProperty = Object.entries(properties).find(([, property]) => "type" in property && property.type === "title")?.[0];
    if (!titleProperty) throw new Error("La base de Notion no tiene una propiedad de título accesible.");
    const workflowProperty = Object.entries(properties).find(([name, property]) => name.toLowerCase().includes("workflow") && "type" in property && property.type === "rich_text")?.[0];
    if (workflowProperty) {
      const found = await this.client.dataSources.query({ data_source_id: this.dataSourceId, filter: { property: workflowProperty, rich_text: { equals: payload.workflowId } }, page_size: 1 });
      const page = found.results.find((result) => result.object === "page");
      if (page) return { externalPageId: page.id, externalUrl: "url" in page ? page.url : undefined, mocked: false, payload };
    }
    const content = [`Puntuación: ${payload.score}/100 · Estado: ${payload.status}`, `Confianza: ${payload.confidence}% · Riesgo: ${payload.risk}`, `Resumen: ${payload.investigationSummary}`, `Contradicciones: ${payload.contradictions.join("; ") || "Ninguna registrada"}`, `Fuentes: ${payload.sourceLinks.join("\n")}`, ...payload.variants.map((variant) => `${variant.outlet}\n${variant.headline}\n${variant.body}`), `Expediente: ${payload.dossierUrl}`, `Workflow ID: ${payload.workflowId}`];
    const page = await this.client.pages.create({ parent: { type: "data_source_id", data_source_id: this.dataSourceId }, properties: { [titleProperty]: { type: "title", title: richText(payload.title) }, ...(workflowProperty ? { [workflowProperty]: { type: "rich_text", rich_text: richText(payload.workflowId) } } : {}) }, children: content.map((line) => ({ object: "block", type: "paragraph", paragraph: { rich_text: richText(line) } })) });
    return { externalPageId: page.id, externalUrl: "url" in page ? page.url : undefined, mocked: false, payload };
  }
}

export function createNotionAdapter(): NotionAdapter { return process.env.DEMO_MODE !== "false" || !process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID ? new MockNotionAdapter() : new RealNotionAdapter(); }
