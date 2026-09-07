export const INSOMNIO_SOCIAL_MASTER_PROMPT = `Social media news card. Use the exact aspect ratio specified in the brief: 4:5 for Instagram/Facebook Feed, 9:16 for Stories/Reels/Shorts, or 1:1 for square/multiplatform output. No borders, no padding.

SUBJECT 1 — IMAGEN PRINCIPAL
Use the exact image provided by the user. Do not generate, replace, modify, filter or alter this image in any way. Place it occupying the top 62% of the card exactly as is.

LOGO — ESQUINA SUPERIOR IZQUIERDA
Insomnio Guatemala logo: dark navy bold letter “i” with white diagonal cut inside, script text “Guatemala” below in dark navy. Small size, top left, clean, no shadow. Next to it: small white bold text “INSOMNIO GUATEMALA”. Below: tiny white text “El dato que no te deja dormir”.

BADGE OPCIONAL — ESQUINA SUPERIOR DERECHA
Solo si la noticia es urgente o de último momento: rectángulo rojo sólido con texto blanco “ÚLTIMO MOMENTO” o “URGENTE | GUATEMALA”. Omitir por completo para noticias no urgentes.

BLOQUE DE TEXTO — 38% INFERIOR
Fondo negro puro #000000. Corte duro desde la imagen, sin fade ni gradiente. Tipografía sans-serif condensada, centrada, bold, mixed-case, grande y con interlineado cerrado.

SISTEMA DE COLORES
Blanco #FFFFFF: hecho base — quién, qué, dónde.
Amarillo #FACC15: elemento perturbador, misterioso o giro inesperado.
Verde #4ADE4A: dato de impacto o remate inesperado, usado con moderación.

REGLAS
Máximo 6 líneas. Sin rectángulos detrás del texto. Una sola pregunta si aplica, siempre amarilla y al final. Nunca más de 2 colores de acento por tarjeta.

ESTILO GENERAL
Dark mystery editorial. High contrast. Subject 1 fotorrealista y completamente intacto. Sin neón, glow, gradientes de texto, adornos ni iconos adicionales. Crudo, oscuro, perturbador pero factual.`;

export function isInsomnioOutlet(outlet: string) {
  const normalized = outlet.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.includes("insonimio guatemala") || normalized.includes("insomnio guatemala");
}

export function socialAspectRatioForPlatform(platform: string) {
  const normalized = platform.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/story|reel|short|tiktok/.test(normalized)) return "9:16" as const;
  if (/instagram feed|facebook feed/.test(normalized) || normalized === "instagram" || normalized === "facebook") return "4:5" as const;
  if (/threads|multiplataforma|cuadrad/.test(normalized)) return "1:1" as const;
  return null;
}
