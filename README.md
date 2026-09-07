# Nexo — sala editorial con agentes de IA

MVP interno para Insonimio Guatemala, Yo Amo Guate, Trece Noticias y TV Azteca Guate. Ejecuta el flujo **detectar → puntuar → investigar → reunir evidencia → crear cuatro versiones → coordinar la producción de video → sincronizar una tarea → solicitar aprobación humana**. Nunca publica en redes sociales ni en WordPress.

> Todos los registros del seed son ficticios y están marcados con `isFictional`. No deben interpretarse como noticias reales.

## Qué incluye

- Aplicación full stack con Next.js 16, TypeScript, Tailwind CSS y rutas App Router.
- PostgreSQL 17 mediante Docker Compose y Prisma ORM 7 con migración inicial.
- Worker independiente y cola transaccional basada en PostgreSQL (`FOR UPDATE SKIP LOCKED`).
- Orquestador supervisado con especialistas de investigación y adaptación expuestos como herramientas mediante OpenAI Agents SDK.
- Adaptadores reales y simulados para OpenAI, Notion y RSS.
- Puntuación determinista 0–100, detección de duplicados, expediente de evidencia y clasificación de riesgo validada por reglas.
- Cuatro perfiles editoriales versionados y cuatro borradores editables de manera independiente.
- Sala de control audiovisual con brief obligatorio, ocho autores AI especializados, transmisión de actividad en tiempo real, entregables firmados y aprobación final humana.
- Autenticación interna de demostración, autorización por rol y aprobación humana atribuida.
- Trazas locales sin secretos, historial de estados, idempotencia y reintentos limitados.
- Pruebas automatizadas, incluido un recorrido end-to-end sin red ni costo y reglas deterministas del flujo de video.

## Requisitos

- Node.js 22.13 o posterior.
- pnpm 11 o posterior.
- Docker Desktop o una instancia PostgreSQL 17 accesible.

## Instalación rápida

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

En terminales separadas:

```bash
pnpm dev
pnpm worker
```

Abra `http://localhost:3000`. En modo demostración, la pantalla de acceso permite elegir usuarios ficticios con distintos roles. No hay contraseñas reales en el repositorio.

Si Docker no está disponible, puede usar la base PostgreSQL embebida de desarrollo en una terminal:

```bash
pnpm db:local
```

Use `postgresql://nexo:nexo_demo@127.0.0.1:5434/postgres?sslmode=disable&schema=public` como `DATABASE_URL`, y luego ejecute las migraciones y el seed normalmente. Esta alternativa es solo para demostración local.

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL. El ejemplo usa el puerto local `5434`. |
| `DEMO_MODE` | Sí | `true` bloquea llamadas externas y usa fixtures deterministas. |
| `APP_URL` | Sí | Enlace al expediente incluido en Notion. |
| `AUTH_SECRET` | Sí | Firma de la cookie interna. Debe cambiarse fuera del entorno local. |
| `EDITORIAL_TIMEZONE` | No | Valor esperado: `America/Guatemala`. |
| `OPENAI_API_KEY` | Solo modo real | Clave leída exclusivamente por el servidor. |
| `OPENAI_MODEL` | Solo modo real | Modelo usado por el orquestador; el ejemplo usa `gpt-5.4`. |
| `NOTION_API_KEY` | Solo modo real | Token de una conexión interna de Notion. |
| `NOTION_DATABASE_ID` | Solo modo real | ID del **data source** que contiene las tareas. Se conserva el nombre solicitado por compatibilidad. |
| `NOTION_API_VERSION` | No | Por defecto `2026-03-11`. |
| `TRUSTED_DOMAINS` | No | Allowlist para futuras consultas externas controladas. |
| `RSS_TIMEOUT_MS` / `RSS_MAX_BYTES` | No | Límites de tiempo y tamaño del lector RSS. |

Nunca exponga estas variables con prefijo `NEXT_PUBLIC_`. Los adaptadores redactan claves y tokens antes de persistir trazas.

## Modo demostración

`DEMO_MODE=true` garantiza que:

- OpenAI usa `MockOpenAIAdapter` con resultados deterministas y Zod.
- Notion conserva el payload, genera un identificador `mock-notion-*` y registra una excepción manual; no finge una sincronización externa exitosa.
- RSS usa un fixture determinista y permite comprobar deduplicación.
- Ninguna prueba automatizada realiza llamadas reales ni genera costos.

Puede verificar el flujo puro sin base de datos:

```bash
pnpm demo:flow
```

## Modo real: OpenAI

1. Configure `DEMO_MODE=false`, `OPENAI_API_KEY` y `OPENAI_MODEL`.
2. Reinicie la aplicación y el worker.
3. El adaptador crea un agente orquestador y dos especialistas mediante `agent.asTool()`.
4. El resultado final se valida con Zod; las reglas deterministas vuelven a comprobar evidencia, hechos y riesgo.

En la sala audiovisual, cada tarea se ejecuta con su propio agente especializado. Guion y plan visual corren en paralelo; sus estados y entregas llegan al navegador mediante Server-Sent Events y quedan persistidos en la bitácora. En demo se conserva la misma secuencia con entregables deterministas y sin costo.

La implementación sigue la documentación oficial de [OpenAI Agents SDK para TypeScript](https://openai.github.io/openai-agents-js/), [herramientas](https://openai.github.io/openai-agents-js/guides/tools/), [guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/), [tracing](https://openai.github.io/openai-agents-js/guides/tracing/) y [human-in-the-loop](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/). La aprobación editorial del MVP se persiste en la máquina de estados propia; el adaptador queda preparado para reanudar interrupciones del SDK en una fase posterior.

## Modo real: Notion

1. Cree una conexión interna y comparta con ella la base de tareas.
2. Configure `NOTION_API_KEY` y el ID del data source en `NOTION_DATABASE_ID`.
3. La base debe tener al menos una propiedad de tipo `title`. Opcionalmente agregue una propiedad `rich_text` cuyo nombre contenga “Workflow”; se usará para consultar idempotencia.
4. El resto del expediente se envía como bloques, por lo que no depende de nombres rígidos de propiedades.

El adaptador usa la API vigente de Notion con [data sources](https://developers.notion.com/reference/query-a-data-source), [creación de páginas](https://developers.notion.com/reference/post-page) y autenticación Bearer descrita en la [introducción oficial](https://developers.notion.com/reference/intro).

## Flujo y worker

Al crear una tendencia, la API guarda el registro y agrega un `Job` idempotente. El worker:

1. reclama un trabajo pendiente con bloqueo transaccional;
2. calcula la puntuación en código;
3. llama al especialista de investigación;
4. valida dos fuentes independientes y una fuente primaria;
5. genera y valida las cuatro versiones;
6. clasifica el riesgo con reglas deterministas;
7. sincroniza Notion de forma idempotente o registra la excepción de demo;
8. se detiene en `AWAITING_APPROVAL`.

Los fallos se reintentan como máximo tres veces con espera exponencial. Los borradores ya persistidos no se eliminan. Consulte [docs/architecture.md](docs/architecture.md) para los diagramas.

## Usuarios ficticios del seed

| Usuario | Rol | Uso de prueba |
| --- | --- | --- |
| `admin@nexo.demo` | `ADMIN` | Observar a los agentes, controlar puntos críticos y decidir sobre el paquete final. |
| `ana@nexo.demo` | `EDITOR_SENIOR` | Riesgo alto con comentario y confirmación. |
| `luis@nexo.demo` | `EDITOR_MARCA` | Riesgo bajo/medio del medio asignado. |
| `sofia@nexo.demo` | `REPORTERO` | Crear tendencias y añadir fuentes; no aprobar. |
| `direccion@nexo.demo` | `DIRECCION` | Riesgo crítico y reglas editoriales. |
| `maria@nexo.demo` | `EDITOR_MARCA` | Guion, plan visual y edición para TV Azteca Guate. |

## Datos incluidos

- Cuatro medios y sus perfiles iniciales versionados.
- Cinco feeds configurables.
- Caso cultural aprobado, servicio pendiente, política rechazada y evidencia insuficiente.
- Fuentes, evidencias, puntuaciones, borradores, historial, payloads de Notion y una producción de video colaborativa simulados.

## Cómo funciona la producción de video

Desde Órdenes se registra directamente el encargo para un medio, su producto, objetivo, audiencia, plataforma, fuente e imagen principal. Antes de iniciar, Administración revisa la orden completa. El usuario humano actúa como observador y responsable de la decisión, no como autor del guion o la edición.

1. **Alba · Productora AI:** convierte el encargo en brief operativo.
2. **Certeza · Verificación AI:** controla fuentes, certeza y derechos.
3. **Tinta · Guionista AI** y **Plano · Dirección visual AI:** trabajan en paralelo.
4. **Pulso · Producción AI** y **Corte · Edición AI:** preparan rodaje, montaje y exportación.
5. **Faro · Control editorial AI:** revisa precisión, contexto y riesgos.
6. **Norte · Dirección AI:** consolida una recomendación, sin aprobar por el humano.

Cada inicio, entrega, bloqueo y traspaso aparece en vivo y queda en la base con agente, hora y evidencia. Al terminar, el flujo se detiene en `WAITING_ADMIN`; sólo `ADMIN` o `DIRECCION` puede aprobar o solicitar ajustes. El MVP crea el paquete editorial y técnico de producción, pero no renderiza un MP4 ni publica en redes.

## Pruebas y verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

Las pruebas cubren puntuación, duplicados, riesgo, estados, permisos, Zod/reparación, evidencia, idempotencia de Notion, adaptación por medio, error y reintento de Notion, evidencia insuficiente, rechazo, correcciones, aprobación sin permiso y el recorrido end-to-end.

## Seguridad implementada

- Validación Zod en entradas y salidas estructuradas.
- Cookies `httpOnly`, firma HMAC, protección de rutas y autorización del lado servidor.
- Verificación básica de origen y rate limiting en endpoints sensibles.
- Protección SSRF: solo HTTP/HTTPS, sin credenciales, sin localhost, IP privadas ni dominios `.local`.
- Límite de tiempo, tamaño y redirecciones en RSS.
- Redacción recursiva de secretos en eventos y trazas.
- Idempotency keys únicas para trabajos, flujos, Notion y eventos de integración.
- Las credenciales nunca se entregan a los agentes.

Para producción se debe reemplazar el selector de usuarios demo por el proveedor de identidad corporativo, usar un rate limiter distribuido y resolver DNS antes de cada descarga para endurecer la defensa SSRF contra DNS rebinding.

## Supuestos técnicos

- El “database ID” solicitado para Notion corresponde al data source vigente de la base de tareas.
- Los feeds sembrados son ejemplos configurables; algunos sitios pueden usar URLs distintas y el sistema no elude bloqueos.
- La búsqueda web adicional queda como interfaz futura. En el MVP solo se investigan fuentes almacenadas.
- El modelo sugiere riesgo y relevancia, pero el valor final nunca puede quedar por debajo de las reglas deterministas.
- Falta de dos fuentes o de una primaria produce `EVIDENCE_INCOMPLETE`; no se describe el contenido como confirmado.
- La excepción de Notion del modo demo permite llegar a revisión porque queda explícitamente registrada. En modo real, un fallo mantiene el flujo fuera de `AWAITING_APPROVAL`.

## Solución de problemas

- **No conecta a PostgreSQL:** confirme `docker compose ps`, el puerto `5434` y `DATABASE_URL`.
- **Prisma Client no existe:** ejecute `pnpm db:generate`.
- **No aparecen usuarios en login:** ejecute migraciones y luego `pnpm db:seed`.
- **El worker no procesa:** confirme que corre `pnpm worker` y revise `Job.lastError` / la página Trazabilidad.
- **Notion devuelve 404:** comparta la base original con la conexión y use el ID del data source, no una vista vinculada.
- **OpenAI no se activa:** configure las variables y `DEMO_MODE=false`; las pruebas siempre deben seguir en modo simulado.

## Limitaciones y siguiente fase

No incluye publicación, generación de imágenes/video, scraping protegido, analítica real, búsqueda externa, notificaciones ni automatización de contenido crítico. Siguiente fase recomendada:

1. SSO corporativo y administración completa de membresías.
2. Reanudación persistente de interrupciones HITL nativas del Agents SDK.
3. Búsqueda externa con proveedores aprobados y allowlists por redacción.
4. Editor rico con diff visual, comentarios por fragmento y bloqueo optimista.
5. Webhooks de Notion y métricas operativas/costos por modelo.
6. Observabilidad distribuida y rate limiting compartido.

## Garantía de alcance

No existe estado `PUBLISHED`, endpoint de publicación ni credencial de redes sociales/WordPress. `APPROVED` significa únicamente que una persona autenticada cerró la revisión editorial.
