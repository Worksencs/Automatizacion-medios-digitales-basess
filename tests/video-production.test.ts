import { describe, expect, it } from "vitest";
import { canUpdateVideoTask, documentTaskBlueprints, getProductionTaskBlueprints, isProductionBriefReady, productionDefaultsForFormat, requireCompletionEvidence, socialCardTaskBlueprints, summarizeVideoProgress, videoTaskBlueprints } from "@/src/domain/video-production";
import { socialAspectRatioForPlatform } from "@/src/domain/insomnio-social-template";
import { assessVisualCopyAlignment, subjectImageAnalysisSchema } from "@/src/domain/subject-image-analysis";

describe("producción colaborativa de video", () => {
  it("reparte el flujo entre los cuatro roles editoriales", () => {
    expect(new Set(videoTaskBlueprints.map((task) => task.assignedRole))).toEqual(new Set(["REPORTERO", "EDITOR_MARCA", "EDITOR_SENIOR", "DIRECCION"]));
    expect(videoTaskBlueprints).toHaveLength(9);
  });

  it("cambia el flujo cuando la salida es un documento PDF", () => {
    expect(getProductionTaskBlueprints("EDITORIAL_DOCUMENT")).toBe(documentTaskBlueprints);
    expect(documentTaskBlueprints[2].title).toMatch(/Redactar/);
    expect(documentTaskBlueprints[6].title).toMatch(/maquetar/);
  });

  it("convierte automáticamente el formato editorial en el tipo de producción correcto", () => {
    expect(productionDefaultsForFormat("Nota web")).toMatchObject({ outputKind: "EDITORIAL_DOCUMENT", primaryPlatform: "Documento PDF" });
    expect(productionDefaultsForFormat("Post de imagen")).toMatchObject({ outputKind: "SOCIAL_CARD", aspectRatio: "4:5" });
    expect(productionDefaultsForFormat("Reel")).toMatchObject({ outputKind: "AUDIOVISUAL", aspectRatio: "9:16" });
    expect(productionDefaultsForFormat("Video explicativo")).toMatchObject({ outputKind: "AUDIOVISUAL", aspectRatio: "16:9" });
  });

  it("adapta el flujo para una tarjeta gráfica social en HTML", () => {
    expect(getProductionTaskBlueprints("SOCIAL_CARD")).toBe(socialCardTaskBlueprints);
    expect(socialCardTaskBlueprints[3].title).toMatch(/composición visual/i);
    expect(socialCardTaskBlueprints[4].title).toMatch(/arte final/i);
    expect(socialCardTaskBlueprints[6].title).toMatch(/HTML/i);
    expect(isProductionBriefReady({ outputKind: "SOCIAL_CARD", productType: "Tarjeta informativa", objective: "Informar con claridad", audience: "Lectores", durationSeconds: 0, primaryPlatform: "Instagram Feed", subjectImagePath: "/uploads/demo/subject-1.jpg", productionNotes: "Diseñar una tarjeta informativa" })).toBe(true);
    expect(isProductionBriefReady({ outputKind: "SOCIAL_CARD", productType: "Tarjeta informativa", objective: "Informar con claridad", audience: "Lectores", durationSeconds: 0, primaryPlatform: "Instagram Feed", subjectImagePath: "/uploads/demo/subject-1.jpg", productionNotes: "Corto" })).toBe(false);
  });

  it("elige la relación según la ubicación social", () => {
    expect(socialAspectRatioForPlatform("Instagram Feed")).toBe("4:5");
    expect(socialAspectRatioForPlatform("Instagram Story / Reel")).toBe("9:16");
    expect(socialAspectRatioForPlatform("Facebook Feed")).toBe("4:5");
    expect(socialAspectRatioForPlatform("Facebook Story / Reel")).toBe("9:16");
    expect(socialAspectRatioForPlatform("Multiplataforma")).toBe("1:1");
  });

  it("detecta cuando el texto editorial contradice el contenido visual", () => {
    const analysis = subjectImageAnalysisSchema.parse({
      provider: "claude",
      summary: "Primer plano de la superficie de la Luna con numerosos cráteres.",
      visibleText: [],
      subjects: ["Luna", "cráteres"],
      setting: "espacio oscuro",
      keywords: ["luna", "cráter", "superficie", "satélite", "espacio"],
      compatibleTopics: ["astronomía", "exploración lunar"],
      warnings: [],
      suggestedCopy: { base: "La superficie de la Luna", accent: "está cubierta de cráteres", impact: "", question: "¿Qué historia guardan?" },
      confidence: 96,
    });
    expect(assessVisualCopyAlignment(analysis, ["La superficie de la Luna", "está cubierta de cráteres"])).toBe("ALIGNED");
    expect(assessVisualCopyAlignment(analysis, ["El Congreso discute", "el presupuesto público"])).toBe("CONFLICT");
    expect(assessVisualCopyAlignment(null, ["Cualquier texto"])).toBe("UNCHECKED");
  });

  it("exige PDF para documentos y duración sólo para audiovisuales", () => {
    const common = { productType: "Nota periodística", objective: "Informar a la audiencia", audience: "Lectores", durationSeconds: 0, subjectImagePath: "/uploads/demo/subject-1.jpg", productionNotes: "Redactar una nota periodística" };
    expect(isProductionBriefReady({ ...common, outputKind: "EDITORIAL_DOCUMENT", primaryPlatform: "Documento PDF" })).toBe(true);
    expect(isProductionBriefReady({ ...common, outputKind: "EDITORIAL_DOCUMENT", primaryPlatform: "Instagram" })).toBe(false);
    expect(isProductionBriefReady({ ...common, outputKind: "AUDIOVISUAL", primaryPlatform: "Instagram" })).toBe(false);
  });

  it("exige evidencia o entregable para completar una tarea", () => {
    expect(() => requireCompletionEvidence("DONE", "", 0)).toThrow(/evidencia/i);
    expect(() => requireCompletionEvidence("DONE", "Guion v1 en carpeta editorial", 0)).not.toThrow();
    expect(() => requireCompletionEvidence("DONE", "", 1)).not.toThrow();
  });

  it("calcula avance, bloqueos y revisión de forma determinista", () => {
    const base = videoTaskBlueprints.map((task) => ({ order: task.order, stage: task.stage, status: task.order <= 4 ? "DONE" as const : "PENDING" as const }));
    expect(summarizeVideoProgress(base)).toMatchObject({ progress: 44, currentStage: "VISUAL_PLAN", status: "IN_PROGRESS" });
    expect(summarizeVideoProgress(base.map((task) => task.order === 5 ? { ...task, status: "BLOCKED" as const } : task))).toMatchObject({ status: "BLOCKED" });
    expect(summarizeVideoProgress(base.map((task) => task.order <= 7 ? { ...task, status: "DONE" as const } : task))).toMatchObject({ progress: 78, currentStage: "EDITORIAL_REVIEW", status: "IN_REVIEW" });
  });

  it("permite al responsable y a los roles de supervisión actualizar tareas", () => {
    expect(canUpdateVideoTask({ role: "REPORTERO", assignedRole: "REPORTERO", userId: "u1" })).toBe(true);
    expect(canUpdateVideoTask({ role: "EDITOR_MARCA", assignedRole: "REPORTERO", userId: "u2" })).toBe(false);
    expect(canUpdateVideoTask({ role: "EDITOR_SENIOR", assignedRole: "REPORTERO", userId: "u3" })).toBe(true);
  });
});
