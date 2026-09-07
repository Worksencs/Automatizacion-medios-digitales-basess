import { isIP } from "node:net";

function isPrivateIp(hostname: string) { if (!isIP(hostname)) return false; return /^(10\.|127\.|169\.254\.|192\.168\.|0\.|::1$|fc|fd)/i.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname); }
export function assertSafeExternalUrl(raw: string, trustedOnly = false) {
  const url = new URL(raw); if (!["http:", "https:"].includes(url.protocol)) throw new Error("Solo se permiten URLs HTTP o HTTPS.");
  if (url.username || url.password) throw new Error("No se permiten credenciales en URLs.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || isPrivateIp(url.hostname)) throw new Error("La URL apunta a una red privada o local.");
  if (trustedOnly) { const allowlist = (process.env.TRUSTED_DOMAINS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean); if (allowlist.length && !allowlist.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) throw new Error("El dominio no está en la lista de confianza."); }
  return url;
}
export function redactSecrets(value: unknown): unknown { if (Array.isArray(value)) return value.map(redactSecrets); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [/key|token|secret|password|authorization/i.test(key) ? key : key, /key|token|secret|password|authorization/i.test(key) ? "[REDACTED]" : redactSecrets(item)])); return value; }
