ALTER TABLE "VideoProject"
  ADD COLUMN "subjectImagePath" TEXT,
  ADD COLUMN "subjectImageName" TEXT,
  ADD COLUMN "subjectImageMime" TEXT,
  ADD COLUMN "breakingBadge" TEXT NOT NULL DEFAULT 'NONE';

UPDATE "VideoTask"
SET "order" = "order" + 100
WHERE "order" >= 5;

UPDATE "VideoTask"
SET "order" = "order" - 99
WHERE "order" >= 105;

INSERT INTO "VideoTask" (
  "id", "videoProjectId", "title", "description", "stage", "assignedRole",
  "agentKey", "agentName", "status", "order", "deliverable", "completedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), p."id",
  CASE
    WHEN p."outputKind" = 'SOCIAL_CARD' THEN 'Diseñar el arte final'
    WHEN p."outputKind" = 'EDITORIAL_DOCUMENT' THEN 'Diseñar el sistema editorial'
    ELSE 'Construir el sistema gráfico'
  END,
  CASE
    WHEN p."outputKind" = 'SOCIAL_CARD' THEN 'El diseñador AI aplica la plantilla de marca, la imagen original, la jerarquía tipográfica y el sistema de color sin alterar el material autorizado.'
    WHEN p."outputKind" = 'EDITORIAL_DOCUMENT' THEN 'El diseñador AI define tipografía, retícula, color y tratamiento visual del documento.'
    ELSE 'El diseñador AI convierte la dirección visual en composición, tipografía, color y reglas de uso de imagen.'
  END,
  'VISUAL_PLAN'::"VideoStage", 'EDITOR_MARCA', 'nexo_designer', 'Lumen',
  CASE WHEN p."progress" = 100 THEN 'DONE'::"VideoTaskStatus" ELSE 'PENDING'::"VideoTaskStatus" END,
  5,
  CASE WHEN p."progress" = 100 THEN 'Diseño heredado de la ejecución anterior; disponible para revisión y para la próxima recalculación con Lumen.' ELSE NULL END,
  CASE WHEN p."progress" = 100 THEN NOW() ELSE NULL END,
  NOW(), NOW()
FROM "VideoProject" p;
