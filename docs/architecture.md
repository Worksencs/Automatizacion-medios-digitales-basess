# Arquitectura

```mermaid
flowchart LR
  U["Reportero / editor"] --> WEB["Next.js · interfaz y APIs"]
  WEB --> PG[("PostgreSQL · Prisma")]
  WEB --> Q["Cola Job en base de datos"]
  Q --> W["Worker independiente"]
  W --> O["Orquestador supervisado"]
  O --> R["Especialista de investigación"]
  O --> A["Especialista de adaptación"]
  R --> G["Zod + reglas de evidencia"]
  A --> F["Zod + control de hechos y riesgo"]
  G --> PG
  F --> PG
  W --> N{"NotionAdapter"}
  N --> NM["Mock · payload persistido"]
  N --> NR["API real · data source"]
  PG --> H["Bandeja de aprobación humana"]
  H --> PG
  PG --> V["Tablero de producción de video"]
  V --> RP["Reportero · brief y verificación"]
  V --> EM["Editor de marca · guion y corte"]
  V --> ES["Editor senior · control editorial"]
  V --> DI["Dirección · visto bueno"]
  RP --> EV["Evidencias y entregables"]
  EM --> EV
  ES --> EV
  DI --> EV
  EV --> PG
```

La puntuación, transición de estados, evidencia mínima, permisos y riesgo se deciden o validan mediante código determinista. El modelo no accede a credenciales ni ejecuta integraciones externas.

# Máquina de estados

```mermaid
stateDiagram-v2
  [*] --> DETECTED
  DETECTED --> SCORING
  SCORING --> SCORED
  SCORED --> INVESTIGATING
  INVESTIGATING --> EVIDENCE_INCOMPLETE: evidencia insuficiente
  EVIDENCE_INCOMPLETE --> INVESTIGATING: reintento
  INVESTIGATING --> EVIDENCE_READY: requisitos cumplidos
  EVIDENCE_READY --> GENERATING_VARIANTS
  GENERATING_VARIANTS --> DRAFTS_READY
  DRAFTS_READY --> SYNCING_NOTION
  SYNCING_NOTION --> AWAITING_APPROVAL: sincronizado o excepción manual registrada
  AWAITING_APPROVAL --> APPROVED: acción humana autorizada
  AWAITING_APPROVAL --> REJECTED: acción humana
  AWAITING_APPROVAL --> NEEDS_REVISION: acción humana
  NEEDS_REVISION --> GENERATING_VARIANTS
  NEEDS_REVISION --> DRAFTS_READY
  REJECTED --> NEEDS_REVISION
  DETECTED --> CANCELLED
  SCORED --> CANCELLED
  EVIDENCE_INCOMPLETE --> CANCELLED
  NEEDS_REVISION --> CANCELLED
  SCORING --> FAILED
  INVESTIGATING --> FAILED
  GENERATING_VARIANTS --> FAILED
  SYNCING_NOTION --> FAILED
  FAILED --> SCORING
  FAILED --> INVESTIGATING
  FAILED --> GENERATING_VARIANTS
  FAILED --> SYNCING_NOTION
  APPROVED --> [*]
  CANCELLED --> [*]
```

`APPROVED` requiere una identidad interna y una autorización compatible con el riesgo. No existe `PUBLISHED`.

# Producción colaborativa de video

Cada `ContentVariant` puede tener un único `VideoProject`. El proyecto conserva participantes, ocho `VideoTask` ordenadas, `VideoEvidence` y `VideoComment`. El servidor valida quién puede actualizar cada tarea; los roles de editor senior, Dirección y administración pueden supervisar el trabajo, mientras que el rol asignado ejecuta su etapa.

El progreso se calcula únicamente a partir de tareas completadas. Un bloqueo lleva el proyecto a `BLOCKED`; al llegar a revisión editorial o de Dirección cambia a `IN_REVIEW`; solo las ocho tareas documentadas producen `READY`. No existe una transición automática desde `READY` hacia publicación.
