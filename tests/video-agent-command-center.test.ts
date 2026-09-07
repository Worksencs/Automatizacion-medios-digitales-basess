import { describe, expect, it } from "vitest";
import { aiAgentTeam, isProductionBriefReady, videoAgentPhases, videoTaskBlueprints } from "@/src/domain/video-production";
import { buildDemoDeliverable, claudeMessagesEndpoint, productionAiProvider } from "@/src/services/video-agent-team";
import { editorialAiProvider, RealClaudeEditorialAdapter, createOpenAIAdapter } from "@/src/adapters/openai";

describe("sala de control audiovisual", () => {
  it("asigna un autor AI único y visible a cada etapa", () => {
    expect(videoTaskBlueprints).toHaveLength(9);
    expect(new Set(videoTaskBlueprints.map((task) => task.agentKey)).size).toBe(9);
    expect(new Set(aiAgentTeam.map((agent) => agent.key))).toEqual(new Set(videoTaskBlueprints.map((task) => task.agentKey)));
  });

  it("ejecuta a los nueve autores como un solo equipo concurrente", () => {
    expect(videoAgentPhases).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9]]);
  });

  it("bloquea la producción hasta tener un encargo y una imagen principal", () => {
    expect(isProductionBriefReady({ productType: "Reel", objective: "Explicar el cambio", audience: "Guatemala", durationSeconds: 60, primaryPlatform: "Instagram", productionNotes: "Crear un reel informativo" })).toBe(false);
    expect(isProductionBriefReady({ productType: "Reel", objective: "Explicar el cambio", audience: "Guatemala", durationSeconds: 60, primaryPlatform: "Instagram", subjectImagePath: "/uploads/demo/subject-1.jpg", productionNotes: "Crear un reel informativo" })).toBe(true);
  });

  it("produce entregables demo vinculados al producto", () => {
    const output = buildDemoDeliverable(1, { title: "Demo", headline: "Cambio", hook: "Atención", outlet: "Trece Noticias", productType: "Video explicativo", objective: "Informar", audience: "Usuarios", durationSeconds: 60, primaryPlatform: "YouTube", sourceCount: 2 });
    expect(output).toContain("Video explicativo");
    expect(output).toContain("YouTube");
    expect(output).toContain("60 s");
  });

  it("prioriza Claude para los nueve autores cuando está configurado", () => {
    const previous = { demo: process.env.DEMO_MODE, claude: process.env.ANTHROPIC_API_KEY, claudeEnabled: process.env.ANTHROPIC_ENABLED, openai: process.env.OPENAI_API_KEY };
    try {
      process.env.DEMO_MODE = "false";
      process.env.ANTHROPIC_API_KEY = "test-only";
      process.env.ANTHROPIC_ENABLED = "true";
      process.env.OPENAI_API_KEY = "test-only";
      expect(productionAiProvider()).toBe("claude");
    } finally {
      if (previous.demo === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = previous.demo;
      if (previous.claude === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = previous.claude;
      if (previous.claudeEnabled === undefined) delete process.env.ANTHROPIC_ENABLED; else process.env.ANTHROPIC_ENABLED = previous.claudeEnabled;
      if (previous.openai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous.openai;
    }
  });

  it("normaliza hosts Claude compatibles sin duplicar /v1", () => {
    expect(claudeMessagesEndpoint("https://api.nghimmo.com/v1")).toBe("https://api.nghimmo.com/v1/messages");
    expect(claudeMessagesEndpoint("https://api.anthropic.com")).toBe("https://api.anthropic.com/v1/messages");
  });

  it("usa Claude también para investigación y redacción editorial", () => {
    const previous = { demo: process.env.DEMO_MODE, claude: process.env.ANTHROPIC_API_KEY, claudeEnabled: process.env.ANTHROPIC_ENABLED, openai: process.env.OPENAI_API_KEY };
    try {
      process.env.DEMO_MODE = "false";
      process.env.ANTHROPIC_API_KEY = "test-only";
      process.env.ANTHROPIC_ENABLED = "true";
      delete process.env.OPENAI_API_KEY;
      expect(editorialAiProvider()).toBe("claude");
      expect(createOpenAIAdapter()).toBeInstanceOf(RealClaudeEditorialAdapter);
    } finally {
      if (previous.demo === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = previous.demo;
      if (previous.claude === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = previous.claude;
      if (previous.claudeEnabled === undefined) delete process.env.ANTHROPIC_ENABLED; else process.env.ANTHROPIC_ENABLED = previous.claudeEnabled;
      if (previous.openai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous.openai;
    }
  });
});
